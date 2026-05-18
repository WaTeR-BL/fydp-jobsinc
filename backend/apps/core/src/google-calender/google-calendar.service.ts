import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { calendar_v3 } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import Calendar = calendar_v3.Calendar;
import { CreateEventDto, UpdateEventDto } from './dto/google-calendar.dto';
import { v4 as uid } from 'uuid';
import { MeetEventData } from '../applicant-interviewer/interface/interview.interface';
import { CredentialManagerService } from '../credential-manager/credential-manager.service';
import { AuthUrl } from '../job-posting/dto/job-posting.dto';
import { RedisService } from '@app/common/redis/redis.service';
import { toUtc } from '../common/helper/timezone-handler.helper';
import { DateTime } from 'luxon';

@Injectable()
export class GoogleCalendarService {
    private readonly calendarCache = new Map<
        string,
        { calendar: Calendar; timestamp: number }
    >();
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;
    private readonly scopes: string[];
    constructor(
        private readonly config: ConfigService,
        private readonly credentialService: CredentialManagerService,
        private readonly redisService: RedisService,
    ) {
        this.clientId = this.config.get<string>('google.client_id');
        this.clientSecret = this.config.get<string>('google.client_secret');
        this.redirectUri = this.config.get<string>('google.redirect_uri');
        this.scopes = this.config.get<string[]>('google.scopes');
    }

    private async verifyAndConsumeState(
        state: string,
        expectedTenantId: string,
        expectedUserId: string,
    ): Promise<boolean> {
        try {
            const storedState = await this.redisService.get(
                `google_state_${state}`,
            );

            if (!storedState) {
                return false;
            }

            const stateData = JSON.parse(
                Buffer.from(state, 'base64').toString(),
            );
            const tenantId: string = stateData.tenantId;
            const userId: string = stateData.userId;

            if (tenantId !== expectedTenantId) {
                return false;
            }

            if (userId !== expectedUserId) {
                return false;
            }

            await this.redisService.del(`google_state_${state}`);
            return true;
        } catch {
            return false;
        }
    }

    async initiateGoogleAuth(
        tenantId: string,
        userId: string,
    ): Promise<[string, boolean, AuthUrl]> {
        try {
            const oauth2Client = new google.auth.OAuth2(
                this.clientId,
                this.clientSecret,
                this.redirectUri,
            );

            const state = Buffer.from(
                JSON.stringify({ tenantId, userId }),
            ).toString('base64');

            await this.redisService.write(
                `google_state_${state}`,
                tenantId,
                300,
            );

            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: this.scopes,
                state: state,
                prompt: 'consent',
            });

            const result: AuthUrl = {
                url: authUrl,
            };

            return ['Authorization URL generated', true, result];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async handleGoogleCallback(
        code: string,
        state: string,
    ): Promise<[string, boolean]> {
        if (!code || !state) {
            return ['Missing authorization code or state', false];
        }

        try {
            const stateData = JSON.parse(
                Buffer.from(state, 'base64').toString(),
            );
            const tenantId: string = stateData.tenantId;
            const userId: string = stateData.userId;

            const isValidState = await this.verifyAndConsumeState(
                state,
                tenantId,
                userId,
            );
            if (!isValidState) {
                return ['Invalid or expired state parameter', false];
            }

            const oauth2Client = new google.auth.OAuth2(
                this.clientId,
                this.clientSecret,
                this.redirectUri,
            );

            const { tokens } = await oauth2Client.getToken(code);

            if (!tokens.access_token) {
                throw new Error('No access token received');
            }

            if (!tokens.refresh_token) {
                throw new Error(
                    'No refresh token received. User may have already authorized this app.',
                );
            }

            oauth2Client.setCredentials(tokens);
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();

            const email = userInfo.data.email;
            if (!email) {
                throw new Error('Could not retrieve user email');
            }

            const expiresAt = new Date(tokens.expiry_date);

            const [msg, ok] =
                await this.credentialService.storeGoogleCredentials(
                    tenantId,
                    userId,
                    {
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                        expiresAt: expiresAt,
                        email: email,
                    },
                );

            if (!ok) {
                throw new Error(`Failed to store credentials: ${msg}`);
            }

            return ['Google Calendar connected successfully', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    private async createOAuth2Client(
        tenantId: string,
        userId: string,
    ): Promise<[string, boolean, OAuth2Client | null]> {
        try {
            const [msg, ok, credential] =
                await this.credentialService.getGoogleCredentials(
                    tenantId,
                    userId,
                );

            if (!ok || !credential) {
                return [msg || 'No Google credentials found', false, null];
            }

            const oauth2Client = new google.auth.OAuth2(
                this.clientId,
                this.clientSecret,
                this.redirectUri,
            );

            oauth2Client.setCredentials({
                access_token: credential.accessToken,
                refresh_token: credential.refreshToken,
                expiry_date: credential.expiresAt?.getTime(),
            });

            oauth2Client.on('tokens', async (tokens) => {
                if (tokens.access_token) {
                    await this.credentialService.updateGoogleAccessToken(
                        tenantId,
                        userId,
                        tokens.access_token,
                        tokens.refresh_token,
                        new Date(tokens.expiry_date!),
                    );
                }
            });

            const isExpired =
                !credential.expiresAt ||
                Date.now() >= credential.expiresAt.getTime() - 5 * 60 * 1000;

            if (isExpired) {
                const { credentials } = await oauth2Client.refreshAccessToken();

                oauth2Client.setCredentials(credentials);

                await this.credentialService.updateGoogleAccessToken(
                    tenantId,
                    userId,
                    credentials.access_token!,
                    credentials.refresh_token!,
                    new Date(credentials.expiry_date!),
                );
            }

            return ['OAuth client created successfully', true, oauth2Client];
        } catch (error: any) {
            if (error.response?.status === 401) {
                return [
                    'Google authentication failed. Please reconnect your account.',
                    false,
                    null,
                ];
            }
            return [error.message, false, null];
        }
    }

    private async getCalendarClient(
        tenantId: string,
        userId: string,
    ): Promise<[string, boolean, Calendar | null]> {
        try {
            const [msg, ok, oauth2Client] = await this.createOAuth2Client(
                tenantId,
                userId,
            );

            if (!ok || !oauth2Client) {
                return [msg, false, null];
            }

            const calendar = google.calendar({
                version: 'v3',
                auth: oauth2Client,
            });

            return ['Calendar client created successfully', true, calendar];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    private validateEventTimes(
        startTime: string,
        endTime: string,
        timezone: string,
    ): void {
        const start = toUtc(startTime, timezone);
        const end = toUtc(endTime, timezone);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error('Invalid date format for event times');
        }

        if (start >= end) {
            throw new Error('Event start time must be before end time');
        }

        if (start < toUtc(DateTime.now().toISO(), timezone)) {
            throw new Error('Event start time cannot be in the past');
        }
    }

    async createMeetEvent(
        dto: CreateEventDto,
    ): Promise<[string, boolean, MeetEventData | null]> {
        try {
            this.validateEventTimes(dto.startTime, dto.endTime, dto.timeZone);

            if (!dto.applicantEmail) {
                throw new Error('applicant email is required');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(dto.applicantEmail)) {
                throw new Error(
                    `Invalid applicant email: ${dto.applicantEmail}`,
                );
            }

            const [msg, ok, calendar] = await this.getCalendarClient(
                dto.tenantId,
                dto.userId,
            );

            if (!ok || !calendar) {
                return [
                    msg ||
                        'Failed to get calendar client. Please ensure Google account is connected.',
                    false,
                    null,
                ];
            }

            const attendees: calendar_v3.Schema$EventAttendee[] = [];

            attendees.push({
                email: dto.interviewerEmail,
                displayName: dto.interviewerName || 'Interviewer',
                organizer: true,
                responseStatus: 'accepted',
            });

            attendees.push({
                email: dto.applicantEmail,
                displayName: dto.applicantName || 'Candidate',
                optional: false,
                comment: 'Candidate - Please wait for admission',
            });

            const uniqueId = uid();

            const event: calendar_v3.Schema$Event = {
                summary: dto.summary,
                description: dto.description,
                start: {
                    dateTime: dto.startTime,
                    timeZone: dto.timeZone,
                },
                end: {
                    dateTime: dto.endTime,
                    timeZone: dto.timeZone,
                },
                attendees: attendees,
                conferenceData: {
                    createRequest: {
                        requestId: uniqueId,
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                },
                guestsCanModify: false,
                guestsCanInviteOthers: false,
                guestsCanSeeOtherGuests: true,
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'email', minutes: 30 },
                        { method: 'popup', minutes: 10 },
                    ],
                },
                visibility: 'private',
                transparency: 'opaque',
            };

            const res = await calendar.events.insert({
                calendarId: 'primary',
                conferenceDataVersion: 1,
                requestBody: event,
                sendUpdates: 'all',
            });

            if (!res.data.id) {
                throw new Error('Event created but no event ID returned');
            }

            const data: MeetEventData = {
                meetId: res.data.id,
                link: res.data.htmlLink || '',
                hangoutLink: res.data.hangoutLink,
            };

            return ['Success', true, data];
        } catch (error) {
            let errorMessage = error.message;
            if (error.code === 401) {
                errorMessage =
                    'Calendar authentication failed. Please reconnect your Google account.';
            } else if (error.code === 403) {
                errorMessage =
                    'Insufficient permissions to create calendar events.';
            } else if (error.code === 429) {
                errorMessage = 'Rate limit exceeded. Please try again later.';
            }

            return [errorMessage, false, null];
        }
    }

    async updateEvent(
        eventId: string,
        dto: UpdateEventDto,
        userId: string,
        tenantId: string,
    ): Promise<[string, boolean]> {
        try {
            if (!eventId || eventId.trim() === '') {
                throw new Error('Event ID is required');
            }

            if (!dto.applicantEmail) {
                throw new Error('applicant email is required');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(dto.applicantEmail)) {
                throw new Error(
                    `Invalid applicant email: ${dto.applicantEmail}`,
                );
            }

            this.validateEventTimes(dto.startTime, dto.endTime, dto.timeZone);

            const [msg, ok, calendar] = await this.getCalendarClient(
                tenantId,
                userId,
            );

            if (!ok || !calendar) {
                return [msg || 'Failed to get calendar client', false];
            }

            try {
                await calendar.events.get({
                    calendarId: 'primary',
                    eventId: eventId,
                });
            } catch (error) {
                if (error.code === 404) {
                    throw new Error(
                        'Event not found. It may have been deleted.',
                    );
                }
                throw error;
            }

            const attendees: calendar_v3.Schema$EventAttendee[] = [];

            attendees.push({
                email: dto.applicantEmail,
                displayName: dto.applicantName || 'Candidate',
                optional: false,
                comment: 'Candidate - Please wait for admission',
            });

            const event: calendar_v3.Schema$Event = {
                start: {
                    dateTime: dto.startTime,
                    timeZone: dto.timeZone,
                },
                end: {
                    dateTime: dto.endTime,
                    timeZone: dto.timeZone,
                },
                attendees,
            };

            if (dto.summary) event.summary = dto.summary;
            if (dto.description) event.description = dto.description;

            await calendar.events.update({
                calendarId: 'primary',
                eventId: eventId,
                requestBody: event,
                sendUpdates: 'all',
            });

            return ['Success', true];
        } catch (error) {
            let errorMessage = error.message;
            if (error.code === 401) {
                errorMessage =
                    'Calendar authentication failed. Please reconnect your Google account.';
            } else if (error.code === 403) {
                errorMessage = 'Insufficient permissions to update this event.';
            } else if (error.code === 404) {
                errorMessage = 'Event not found. It may have been deleted.';
            } else if (error.code === 429) {
                errorMessage = 'Rate limit exceeded. Please try again later.';
            }

            return [errorMessage, false];
        }
    }

    async deleteEvent(
        eventId: string,
        tenantId: string,
        userId: string,
        sendUpdates: 'all' | 'none' = 'all',
    ): Promise<[string, boolean]> {
        try {
            if (!eventId || eventId.trim() === '') {
                throw new Error('Event ID is required');
            }

            const [msg, ok, calendar] = await this.getCalendarClient(
                tenantId,
                userId,
            );

            if (!ok || !calendar) {
                return [msg || 'Failed to get calendar client', false];
            }

            await calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
                sendUpdates: sendUpdates,
            });

            return ['Success', true];
        } catch (error) {
            if (error.code === 404) {
                return ['Event not found or already deleted', true];
            }

            return [error.message, false];
        }
    }
}
