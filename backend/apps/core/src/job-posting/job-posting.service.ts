import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { JobStatus, LinkedInMediaCategory } from '@app/common/enums/app.enums';
import { v4 as uuidv4 } from 'uuid';
import { LinkedInOrganization } from '@app/common/schemas/linkedin-organization.schema';
import { AuthUrl, CreatePostDto, MediaUploadDto } from './dto/job-posting.dto';
import { RedisService } from '@app/common/redis/redis.service';
import {
    LinkedInStatus,
    LinkedInTokenResponse,
    LinkedInUserInfo,
    PostResult,
    UploadedMedia,
} from './interface/linkedin.interface';
import { JobService } from '../job/job.service';
import {
    JobPostData,
    UpdateJobLinkedInData,
} from '../job/interface/job.interface';
import pLimit from 'p-limit';
import { CredentialManagerService } from '../credential-manager/credential-manager.service';

@Injectable()
export class JobPostingService {
    private readonly authUrl: string;
    private readonly accessUrl: string;
    private readonly orgUrl: string;
    private readonly orgDetUrl: string;
    private readonly scope: string;
    private readonly emailUrl: string;
    private readonly userInfoUrl: string;
    private readonly shareUrl: string;
    private readonly registerUploadMediaUrl: string;
    private readonly registerUploadVideoUrl: string;
    private readonly uploadLimiter = pLimit(5);
    private readonly postLimiter = pLimit(10);

    /** Refresh access token 5 minutes before it expires */
    private readonly TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

    constructor(
        private readonly config: ConfigService,
        private readonly redisService: RedisService,
        private readonly jobService: JobService,
        private readonly credentialManagerService: CredentialManagerService,
    ) {
        this.authUrl = this.config.get<string>('linkedin.auth');
        this.accessUrl = this.config.get<string>('linkedin.access');
        this.orgUrl = this.config.get<string>('linkedin.org');
        this.orgDetUrl = this.config.get<string>('linkedin.org_details');
        this.scope = this.config.get<string>('linkedin.scope');
        this.emailUrl = this.config.get<string>('linkedin.email');
        this.userInfoUrl = this.config.get<string>('linkedin.user_info');
        this.shareUrl = this.config.get<string>('linkedin.share_url');
        this.registerUploadMediaUrl = this.config.get<string>(
            'linkedin.register_upload_media_url',
        );
        this.registerUploadVideoUrl = this.config.get<string>(
            'linkedin.register_upload_video_url',
        );
    }

    async initiateLinkedInAuth(
        tenantId: string,
    ): Promise<[string, boolean, AuthUrl]> {
        try {
            const clientId = this.config.get<string>('linkedin.client_id');
            const redirectUri = this.config.get<string>(
                'linkedin.redirect_uri',
            );

            const randomState = uuidv4();
            const state = Buffer.from(
                JSON.stringify({ tenantId, randomState }),
            ).toString('base64');

            await this.redisService.write(
                `linkedin_state_${state}`,
                tenantId,
                300,
            );

            const authUrl = this.buildLinkedInAuthUrl(
                clientId,
                redirectUri,
                state,
                this.scope,
            );

            const result: AuthUrl = { url: authUrl };

            return ['Success', true, result];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    private buildLinkedInAuthUrl(
        clientId: string,
        redirectUri: string,
        state: string,
        scope: string,
    ): string {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            state: state,
            scope: scope,
        });

        return `${this.authUrl}?${params.toString()}`;
    }

    async handleLinkedInCallback(
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

            const isValidState = await this.verifyAndConsumeState(
                state,
                tenantId,
            );
            if (!isValidState) {
                return ['Invalid or expired state parameter', false];
            }

            const tokenData = await this.exchangeCodeForToken(code);

            const userInfo = await this.fetchUserInfo(tokenData.access_token);

            let email = userInfo.email;

            if (!email) {
                try {
                    email = await this.fetchUserEmail(tokenData.access_token);
                } catch {
                    email = `${userInfo.sub}@linkedin.member`;
                }
            }

            let organizations: LinkedInOrganization[] | null = null;
            try {
                organizations = await this.fetchOrganizations(
                    tokenData.access_token,
                );
            } catch {
                organizations = null;
            }

            await this.credentialManagerService.storeLinkedInCredentials(
                tenantId,
                tokenData,
                userInfo,
                email,
                organizations,
            );

            return ['LinkedIn account connected successfully', true];
        } catch (error) {
            return [
                error.message || 'Failed to complete LinkedIn authentication',
                false,
            ];
        }
    }

    private async verifyAndConsumeState(
        state: string,
        expectedTenantId: string,
    ): Promise<boolean> {
        try {
            const storedState = await this.redisService.get(
                `linkedin_state_${state}`,
            );

            if (!storedState) return false;

            const stateData = JSON.parse(
                Buffer.from(state, 'base64').toString(),
            );
            const tenantId: string = stateData.tenantId;

            if (tenantId !== expectedTenantId) return false;

            await this.redisService.del(`linkedin_state_${state}`);
            return true;
        } catch {
            return false;
        }
    }

    private async exchangeCodeForToken(
        code: string,
    ): Promise<LinkedInTokenResponse> {
        const redirectUri = this.config.get<string>('linkedin.redirect_uri');
        const clientId = this.config.get<string>('linkedin.client_id');
        const clientSecret = this.config.get<string>('linkedin.client_secret');

        try {
            const response = await axios.post<LinkedInTokenResponse>(
                this.accessUrl,
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri,
                    client_id: clientId,
                    client_secret: clientSecret,
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    timeout: 10000,
                },
            );

            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<any>;
            const errorMsg =
                axiosError.response?.data?.error_description ||
                axiosError.response?.data?.error ||
                axiosError.message ||
                'Token exchange failed';

            throw new BadRequestException(
                `LinkedIn authentication failed: ${errorMsg}`,
            );
        }
    }

    private async refreshAccessToken(
        refreshToken: string,
    ): Promise<LinkedInTokenResponse> {
        const clientId = this.config.get<string>('linkedin.client_id');
        const clientSecret = this.config.get<string>('linkedin.client_secret');

        try {
            const response = await axios.post<LinkedInTokenResponse>(
                this.accessUrl,
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: clientId,
                    client_secret: clientSecret,
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    timeout: 10000,
                },
            );

            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<any>;
            const msg =
                axiosError.response?.data?.error_description ||
                axiosError.response?.data?.error ||
                axiosError.message ||
                'Token refresh failed';

            throw new BadRequestException(
                `LinkedIn token refresh failed: ${msg}`,
            );
        }
    }

    private async getValidAccessToken(
        tenantId: string,
        urnId: string,
    ): Promise<string> {
        const credentials =
            await this.credentialManagerService.getLinkedInCredentialsInternal(
                tenantId,
                undefined,
                urnId,
            );

        if (!credentials) {
            throw new BadRequestException(
                `No LinkedIn credentials found for URN: ${urnId}`,
            );
        }

        if (
            credentials.refreshTokenExpiresAt &&
            new Date() >= new Date(credentials.refreshTokenExpiresAt)
        ) {
            throw new BadRequestException(
                `LinkedIn refresh token expired for ${urnId}. Please re-authenticate.`,
            );
        }

        const expiresAt = new Date(credentials.expiresAt).getTime();
        const isNearExpiry =
            expiresAt <= Date.now() + this.TOKEN_REFRESH_BUFFER_MS;

        if (!isNearExpiry) {
            return credentials.accessToken;
        }

        if (!credentials.refreshToken) {
            throw new BadRequestException(
                `Access token expired and no refresh token available for ${urnId}. Please re-authenticate.`,
            );
        }

        const newTokenData = await this.refreshAccessToken(
            credentials.refreshToken,
        );

        await this.credentialManagerService.updateLinkedInTokens(
            tenantId,
            urnId,
            newTokenData,
        );

        return newTokenData.access_token;
    }

    private async fetchUserInfo(
        accessToken: string,
    ): Promise<LinkedInUserInfo> {
        try {
            const response = await axios.get<LinkedInUserInfo>(
                this.userInfoUrl,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    timeout: 15000,
                    validateStatus: (status) => status < 500,
                },
            );

            if (response.status !== 200) {
                throw new Error(
                    `LinkedIn userinfo returned ${response.status}: ${JSON.stringify(response.data)}`,
                );
            }

            if (!response.data.sub) {
                throw new Error(
                    'LinkedIn userinfo missing required "sub" field',
                );
            }

            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<any>;

            if (axiosError.response?.status === 401) {
                throw new BadRequestException(
                    'Invalid access token. Please try authenticating again.',
                );
            } else if (axiosError.response?.status === 403) {
                throw new BadRequestException(
                    'Access forbidden. Please check your LinkedIn app permissions and scopes.',
                );
            } else if (axiosError.code === 'ECONNREFUSED') {
                throw new BadRequestException(
                    'Cannot connect to LinkedIn API. Please check your network connection.',
                );
            } else if (axiosError.code === 'ETIMEDOUT') {
                throw new BadRequestException(
                    'LinkedIn API request timed out. Please try again.',
                );
            }

            throw new BadRequestException(
                `Failed to fetch user info from LinkedIn: ${axiosError.message}`,
            );
        }
    }

    private async fetchUserEmail(accessToken: string): Promise<string> {
        try {
            const response = await axios.get(this.emailUrl, {
                headers: this.authHeader(accessToken),
                timeout: 10000,
            });

            const email =
                response.data?.elements?.[0]?.['handle~']?.emailAddress;

            if (!email) {
                throw new Error('Email not found in LinkedIn response');
            }

            return email;
        } catch (error) {
            this.handleLinkedInApiError(error, 'fetch email');
        }
    }

    private async fetchOrganizations(
        accessToken: string,
    ): Promise<LinkedInOrganization[] | null> {
        try {
            const aclResponse = await axios.get(`${this.orgUrl}`, {
                params: {
                    q: 'roleAssignee',
                    role: 'ADMINISTRATOR',
                    state: 'APPROVED',
                    projection:
                        '(elements*(organizationalTarget,roleAssignee,state))',
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                    'LinkedIn-Version': '202405',
                },
                timeout: 15000,
                validateStatus: (status) => status < 500,
            });

            if (aclResponse.status !== 200) return null;

            const elements = aclResponse.data?.elements || [];

            if (elements.length === 0) return null;

            const orgUrns = elements
                .map((element: any) => element.organizationalTarget)
                .filter(Boolean);

            if (orgUrns.length === 0) return null;

            const organizations: LinkedInOrganization[] = [];

            for (const urn of orgUrns) {
                try {
                    const orgId = urn.split(':').pop();

                    const orgResponse = await axios.get(
                        `${this.orgDetUrl}/${orgId}`,
                        {
                            params: {
                                projection:
                                    '(id,localizedName,vanityName,logoV2)',
                            },
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                'X-Restli-Protocol-Version': '2.0.0',
                                'LinkedIn-Version': '202405',
                            },
                            timeout: 10000,
                        },
                    );

                    if (orgResponse.status === 200 && orgResponse.data) {
                        organizations.push({
                            organizationId: urn,
                            name:
                                orgResponse.data.localizedName ||
                                orgResponse.data.vanityName ||
                                `Organization ${orgId}`,
                        });
                    }
                } catch {
                    organizations.push({
                        organizationId: urn,
                        name: `Organization ${urn.split(':').pop()}`,
                    });
                }
            }

            return organizations.length > 0 ? organizations : null;
        } catch {
            return null;
        }
    }

    async checkLinkedInStatus(
        tenantId: string,
        email?: string,
    ): Promise<[string, boolean, LinkedInStatus]> {
        try {
            const credentials =
                await this.credentialManagerService.getLinkedInCredentialsInternal(
                    tenantId,
                    email,
                );

            if (!credentials) {
                return [
                    'No LinkedIn account connected',
                    false,
                    {
                        connected: false,
                        expired: null,
                        email: null,
                        urnId: null,
                        expiresAt: null,
                        organizations: null,
                    },
                ];
            }

            const isExpired = new Date() >= new Date(credentials.expiresAt);

            return [
                'LinkedIn status retrieved',
                true,
                {
                    connected: true,
                    expired: isExpired,
                    email: credentials.email,
                    urnId: credentials.urnId,
                    expiresAt: credentials.expiresAt,
                    organizations: credentials.organizations || [],
                },
            ];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async postDraftedJob(
        jobId: string,
        data: JobPostData,
        timezone: string,
    ): Promise<[string, boolean, PostResult[]]> {
        try {
            const credentials =
                await this.credentialManagerService.getCredentialsForTargets(
                    data.tenantId,
                    data.targetUrns,
                );

            if (credentials.length === 0) return;

            const results = await this.postToMultipleTargets(
                credentials.map((c) => ({ ...c, tenantId: data.tenantId })),
                data.text,
                data.media,
                data.visibility || 'PUBLIC',
            );

            await this.updateJobWithSuccessfulPosts(
                jobId,
                data.tenantId,
                results,
                timezone,
            );
            await this.persistPostFailures(
                jobId,
                data.tenantId,
                results,
                data.text,
                data.visibility || 'PUBLIC',
            );

            return this.buildPostResponse(results, credentials.length);
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async createPost(
        jobId: string,
        dto: CreatePostDto,
        tenantId: string,
        timezone: string,
    ): Promise<[string, boolean, PostResult[]]> {
        try {
            const [msg, ok, status] = await this.jobService.jobStatus(jobId);
            if (!ok) return [msg, false, null];

            this.validatePostInput(dto);

            const credentials =
                await this.credentialManagerService.getCredentialsForTargets(
                    tenantId,
                    dto.targetUrns,
                );

            if (credentials.length === 0) {
                return ['No valid credentials found for any target', false, []];
            }

            const firstUrn = credentials[0].urnId;
            const uploadAccessToken = await this.getValidAccessToken(
                tenantId,
                firstUrn,
            );

            const uploadedMedia = await this.handleMediaUpload(
                dto.media,
                credentials[0].urnId,
                uploadAccessToken,
            );

            if (status === JobStatus.DRAFT) {
                return await this.handleDraftPost(
                    jobId,
                    tenantId,
                    dto,
                    uploadedMedia,
                );
            }

            const results = await this.postToMultipleTargets(
                credentials.map((c) => ({ ...c, tenantId })),
                dto.text,
                uploadedMedia,
                dto.visibility || 'PUBLIC',
            );

            await this.updateJobWithSuccessfulPosts(
                jobId,
                tenantId,
                results,
                timezone,
            );
            await this.persistPostFailures(
                jobId,
                tenantId,
                results,
                dto.text,
                dto.visibility || 'PUBLIC',
            );

            return this.buildPostResponse(results, credentials.length);
        } catch (error) {
            return [`Failed to create post: ${error.message}`, false, null];
        }
    }

    private async handleMediaUpload(
        media: any[] | undefined,
        urnId: string,
        accessToken: string,
    ): Promise<UploadedMedia[]> {
        if (!media || media.length === 0) return [];

        return this.uploadMediaBatch(media, urnId, accessToken);
    }

    private async handleDraftPost(
        jobId: string,
        tenantId: string,
        dto: CreatePostDto,
        uploadedMedia: UploadedMedia[],
    ): Promise<[string, boolean, PostResult[]]> {
        const data: JobPostData = {
            tenantId,
            media: uploadedMedia.length > 0 ? uploadedMedia : null,
            visibility: dto.visibility,
            text: dto.text,
            targetUrns: dto.targetUrns,
        };

        await this.jobService.savePostData(jobId, data);
        return ['Waiting for the job to go live', true, null];
    }

    private async updateJobWithSuccessfulPosts(
        jobId: string,
        tenantId: string,
        results: PostResult[],
        timezone: string,
    ): Promise<void> {
        const successfulResults = results.filter((r) => r.success);

        if (successfulResults.length === 0) return;

        const targetUrns = successfulResults.map((r) => r.targetUrn);
        const accountDetails =
            await this.credentialManagerService.getAccountDetailsByUrns(
                tenantId,
                targetUrns,
            );

        if (accountDetails.length === 0) return;

        const linkedInPosts: UpdateJobLinkedInData[] = successfulResults.map(
            (result) => {
                const accountDetail = accountDetails.find(
                    (detail) => detail.urnId === result.targetUrn,
                );

                return {
                    urnId: result.targetUrn,
                    name: accountDetail?.name,
                    url: `https://www.linkedin.com/feed/update/${result.postId}`,
                };
            },
        );

        await this.jobService.updateJobLinkedInStatus(
            jobId,
            linkedInPosts,
            timezone,
        );
    }

    private async persistPostFailures(
        jobId: string,
        tenantId: string,
        results: PostResult[],
        text: string | undefined,
        visibility: string,
    ): Promise<void> {
        const failedResults = results.filter((r) => !r.success);
        if (!failedResults.length) return;

        const failedUrns = failedResults.map((r) => r.targetUrn);
        const accountDetails =
            await this.credentialManagerService.getAccountDetailsByUrns(
                tenantId,
                failedUrns,
            );

        const failures = failedResults.map((r) => ({
            targetUrn: r.targetUrn,
            name:
                accountDetails.find((a) => a.urnId === r.targetUrn)?.name ??
                r.targetUrn,
            reason: r.message ?? 'Unknown error',
            text,
            visibility,
        }));

        await this.jobService.saveFailedLinkedInPosts(jobId, failures);
    }

    async retryFailedPosts(
        jobId: string,
        tenantId: string,
        timezone: string,
    ): Promise<[string, boolean, PostResult[]]> {
        try {
            const job = await this.jobService.getJobForRetry(jobId, tenantId);
            if (!job) return ['Job not found', false, null];

            const failures = job.linkedInFailedPosts ?? [];
            if (!failures.length) {
                return ['No failed posts to retry', false, null];
            }

            const failedUrns = failures.map((f) => f.targetUrn);
            const credentials =
                await this.credentialManagerService.getCredentialsForTargets(
                    tenantId,
                    failedUrns,
                );

            if (!credentials.length) {
                return [
                    'No valid credentials found for failed targets',
                    false,
                    null,
                ];
            }

            const text = failures[0]?.text;
            const visibility = failures[0]?.visibility ?? 'PUBLIC';

            const results = await this.postToMultipleTargets(
                credentials.map((c) => ({ ...c, tenantId })),
                text,
                [],
                visibility,
            );

            const successfulUrns = results
                .filter((r) => r.success)
                .map((r) => r.targetUrn);

            if (successfulUrns.length) {
                await this.updateJobWithSuccessfulPosts(
                    jobId,
                    tenantId,
                    results,
                    timezone,
                );
                await this.jobService.resolveFailedLinkedInPosts(
                    jobId,
                    successfulUrns,
                );
            }

            await this.persistPostFailures(
                jobId,
                tenantId,
                results,
                text,
                visibility,
            );

            return this.buildPostResponse(results, credentials.length);
        } catch (error) {
            return [error.message, false, null];
        }
    }

    private async postToMultipleTargets(
        credentials: Array<{
            urnId: string;
            accessToken: string;
            email: string;
            tenantId: string;
        }>,
        text: string | undefined,
        media: UploadedMedia[],
        visibility: string,
    ): Promise<PostResult[]> {
        const postPromises = credentials.map((cred) =>
            this.postLimiter(async () => {
                const accessToken = await this.getValidAccessToken(
                    cred.tenantId,
                    cred.urnId,
                );
                return this.createSinglePost(
                    cred.urnId,
                    accessToken,
                    text,
                    media,
                    visibility,
                );
            }),
        );

        const results = await Promise.allSettled(postPromises);

        return results.map((result, index) => {
            const targetUrn = credentials[index].urnId;

            if (result.status === 'fulfilled') return result.value;

            return {
                targetUrn,
                success: false,
                message: result.reason?.message || 'Post failed',
                error: result.reason,
            };
        });
    }

    private async createSinglePost(
        authorUrn: string,
        accessToken: string,
        text: string | undefined,
        media: UploadedMedia[],
        visibility: string,
    ): Promise<PostResult> {
        try {
            const mediaCategory = this.determineMediaCategory(media);

            const postBody: any = {
                author: authorUrn,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: text || '',
                        },
                        shareMediaCategory: mediaCategory,
                    },
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': visibility,
                },
            };

            if (media.length > 0) {
                postBody.specificContent[
                    'com.linkedin.ugc.ShareContent'
                ].media = media.map((m) => ({
                    status: m.status,
                    media: m.asset,
                    title: m.title ? { text: m.title } : undefined,
                    description: m.description
                        ? { text: m.description }
                        : undefined,
                }));
            }

            const response = await axios.post(this.shareUrl, postBody, {
                headers: this.authHeader(accessToken),
                timeout: 20000,
            });

            if (response.status !== 201) {
                throw new Error(
                    `Post failed: ${response.status} - ${JSON.stringify(response.data)}`,
                );
            }

            const postId = response.headers['x-restli-id'] || response.data.id;

            return {
                targetUrn: authorUrn,
                success: true,
                message: 'Post created successfully',
                postId,
            };
        } catch (error) {
            const axiosError = error as AxiosError<any>;
            const errorMsg =
                axiosError.response?.data?.message ||
                axiosError.response?.data?.error ||
                axiosError.message ||
                'Post failed';

            return {
                targetUrn: authorUrn,
                success: false,
                message: errorMsg,
                error: axiosError.response?.data,
            };
        }
    }

    private async uploadMediaBatch(
        mediaFiles: MediaUploadDto[],
        authorUrn: string,
        accessToken: string,
    ): Promise<UploadedMedia[]> {
        const uploadPromises = mediaFiles.map((media) =>
            this.uploadLimiter(() =>
                this.uploadSingleMedia(media, authorUrn, accessToken),
            ),
        );

        const results = await Promise.allSettled(uploadPromises);

        const uploadedMedia: UploadedMedia[] = [];
        const errors: string[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                uploadedMedia.push(result.value);
            } else if (result.status === 'rejected') {
                errors.push(`Media ${index + 1}: ${result.reason.message}`);
            }
        });

        if (errors.length > 0 && uploadedMedia.length === 0) {
            throw new BadRequestException(
                `All media uploads failed: ${errors.join('; ')}`,
            );
        }

        return uploadedMedia;
    }

    private async uploadSingleMedia(
        media: MediaUploadDto,
        authorUrn: string,
        accessToken: string,
    ): Promise<UploadedMedia> {
        const isVideo = media.file.mimetype.startsWith('video/');

        return isVideo
            ? this.uploadVideo(media, authorUrn, accessToken)
            : this.uploadImage(media, authorUrn, accessToken);
    }

    private async uploadImage(
        media: MediaUploadDto,
        authorUrn: string,
        accessToken: string,
    ): Promise<UploadedMedia> {
        try {
            const registerBody = {
                registerUploadRequest: {
                    recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                    owner: authorUrn,
                    serviceRelationships: [
                        {
                            relationshipType: 'OWNER',
                            identifier: 'urn:li:userGeneratedContent',
                        },
                    ],
                },
            };

            const registerRes = await axios.post(
                this.registerUploadMediaUrl,
                registerBody,
                {
                    headers: this.authHeader(accessToken),
                    timeout: 15000,
                },
            );

            if (registerRes.status !== 200) {
                throw new Error(
                    `Register upload failed: ${registerRes.status} - ${JSON.stringify(registerRes.data)}`,
                );
            }

            const uploadUrl =
                registerRes.data.value.uploadMechanism[
                    'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
                ].uploadUrl;
            const asset = registerRes.data.value.asset;

            const uploadRes = await axios.put(uploadUrl, media.file.buffer, {
                headers: {
                    'Content-Type': media.file.mimetype,
                    'Content-Length': media.file.size.toString(),
                },
                timeout: 30000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });

            if (uploadRes.status !== 201 && uploadRes.status !== 200) {
                throw new Error(`Image upload failed: ${uploadRes.status}`);
            }

            return {
                asset,
                status: 'READY',
                title: media.title,
                description: media.description,
            };
        } catch (error) {
            const axiosError = error as AxiosError<any>;
            const errorMsg =
                axiosError.response?.data?.message || axiosError.message;
            throw new Error(`Image upload failed: ${errorMsg}`);
        }
    }

    private async uploadVideo(
        media: MediaUploadDto,
        authorUrn: string,
        accessToken: string,
    ): Promise<UploadedMedia> {
        try {
            const initBody = {
                initializeUploadRequest: {
                    owner: authorUrn,
                    fileSizeBytes: media.file.size,
                    uploadCaptions: false,
                    uploadThumbnail: false,
                },
            };

            const initRes = await axios.post(
                this.registerUploadVideoUrl,
                initBody,
                {
                    headers: this.authHeader(accessToken),
                    timeout: 15000,
                },
            );

            if (initRes.status !== 200) {
                throw new Error(
                    `Initialize video upload failed: ${initRes.status}`,
                );
            }

            const uploadUrl =
                initRes.data.value.uploadInstructions[0].uploadUrl;
            const videoUrn = initRes.data.value.video;

            const uploadRes = await axios.put(uploadUrl, media.file.buffer, {
                headers: {
                    'Content-Type': media.file.mimetype,
                    'Content-Length': media.file.size.toString(),
                },
                timeout: 120000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });

            if (uploadRes.status !== 201 && uploadRes.status !== 200) {
                throw new Error(`Video upload failed: ${uploadRes.status}`);
            }

            await axios.post(
                `${this.registerUploadVideoUrl}&action=finalizeUpload`,
                {
                    finalizeUploadRequest: {
                        video: videoUrn,
                        uploadToken: '',
                        uploadedPartIds: [],
                    },
                },
                {
                    headers: this.authHeader(accessToken),
                    timeout: 15000,
                },
            );

            return {
                asset: videoUrn,
                status: 'PROCESSING',
                title: media.title,
                description: media.description,
            };
        } catch (error) {
            const axiosError = error as AxiosError<any>;
            const errorMsg =
                axiosError.response?.data?.message || axiosError.message;
            throw new Error(`Video upload failed: ${errorMsg}`);
        }
    }

    private validatePostInput(dto: CreatePostDto): void {
        if (!dto.text && (!dto.media || dto.media.length === 0)) {
            throw new BadRequestException(
                'Post must contain text and/or media',
            );
        }

        if (dto.media && dto.media.length > 9) {
            throw new BadRequestException('Maximum 9 images allowed per post');
        }

        if (!dto.targetUrns || dto.targetUrns.length === 0) {
            throw new BadRequestException(
                'At least one target URN is required',
            );
        }

        if (dto.text && dto.text.length > 3000) {
            throw new BadRequestException(
                'Text exceeds maximum length of 3000 characters',
            );
        }

        if (dto.media && dto.media.length > 0) {
            for (const media of dto.media) {
                this.validateMediaFile(media.file);
            }
        }
    }

    private validateMediaFile(file: Express.Multer.File): void {
        const allowedImageTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
        ];
        const allowedVideoTypes = [
            'video/mp4',
            'video/mpeg',
            'video/quicktime',
        ];
        const maxImageSize = 10 * 1024 * 1024;
        const maxVideoSize = 200 * 1024 * 1024;

        if (allowedImageTypes.includes(file.mimetype)) {
            if (file.size > maxImageSize) {
                throw new BadRequestException(
                    `Image file ${file.originalname} exceeds maximum size of 10MB`,
                );
            }
        } else if (allowedVideoTypes.includes(file.mimetype)) {
            if (file.size > maxVideoSize) {
                throw new BadRequestException(
                    `Video file ${file.originalname} exceeds maximum size of 200MB`,
                );
            }
        } else {
            throw new BadRequestException(
                `Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, GIF, MP4`,
            );
        }
    }

    private determineMediaCategory(
        media: UploadedMedia[],
    ): LinkedInMediaCategory {
        if (!media || media.length === 0) return LinkedInMediaCategory.NONE;

        const hasVideo = media.some((m) => m.asset.includes('video'));

        return hasVideo
            ? LinkedInMediaCategory.VIDEO
            : LinkedInMediaCategory.IMAGE;
    }

    private buildPostResponse(
        results: PostResult[],
        totalCredentials: number,
    ): [string, boolean, PostResult[]] {
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        const message = `Posted successfully to ${successCount}/${totalCredentials} account(s)${
            failCount > 0 ? `, ${failCount} failed` : ''
        }`;

        return [message, successCount > 0, results];
    }

    private authHeader(accessToken: string): Record<string, string> {
        return {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202405',
        };
    }

    private handleLinkedInApiError(error: any, operation: string): never {
        const axiosError = error as AxiosError<any>;
        const errorMsg =
            axiosError.response?.data?.error_description ||
            axiosError.response?.data?.message ||
            axiosError.message ||
            `Failed to ${operation}`;

        throw new BadRequestException(`Failed to ${operation}: ${errorMsg}`);
    }
}
