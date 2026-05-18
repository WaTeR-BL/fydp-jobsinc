import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    CredentialManager,
    CredentialManagerDocument,
} from '@app/common/schemas/credential-manager.schema';
import { GoogleCredential } from '@app/common/schemas/google-credential.schema';
import { GoogleTokens } from '../google-calender/interface/google.interface';
import {
    LinkedInCredential,
    LinkedInTokenResponse,
    LinkedInUserInfo,
} from '../job-posting/interface/linkedin.interface';
import { LinkedInOrganization } from '@app/common/schemas/linkedin-organization.schema';
import { SocialType, UserRole } from '@app/common/enums/app.enums';
import { LinkedInAccountsDto } from '../job-posting/dto/job-posting.dto';
import { UpdateJobLinkedInData } from '../job/interface/job.interface';
import { GetGoogleCalenderStatus } from './dto/credential-manager.dto';
import { toLocal } from '../common/helper/timezone-handler.helper';
import { DateTime } from 'luxon';

@Injectable()
export class CredentialManagerService {
    constructor(
        @InjectModel(CredentialManager.name)
        private readonly credentialModel: Model<CredentialManagerDocument>,
    ) {}

    private validateObjectId(id: string, fieldName: string): void {
        if (!id || !Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid ${fieldName} format`);
        }
    }

    async storeGoogleCredentials(
        tenantId: string,
        userId: string,
        tokens: GoogleTokens,
    ): Promise<[string, boolean]> {
        try {
            this.validateObjectId(tenantId, 'tenantId');
            this.validateObjectId(userId, 'userId');

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(tokens.email)) {
                throw new Error('Invalid email format');
            }

            if (!tokens.accessToken || !tokens.refreshToken) {
                throw new Error('Access token and refresh token are required');
            }

            const credential: GoogleCredential = {
                userId: new Types.ObjectId(userId) as any,
                email: tokens.email,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: tokens.expiresAt,
            };

            await this.credentialModel.findOneAndUpdate(
                { tenantId: new Types.ObjectId(tenantId) },
                {
                    $pull: {
                        googleCredentials: {
                            userId: new Types.ObjectId(userId),
                        },
                    },
                },
                { upsert: true },
            );

            const result = await this.credentialModel.findOneAndUpdate(
                { tenantId: new Types.ObjectId(tenantId) },
                {
                    $push: {
                        googleCredentials: credential,
                    },
                },
                { new: true, upsert: true },
            );

            if (!result) {
                throw new Error('Failed to store credentials');
            }

            return ['Credentials stored successfully', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async getGoogleCredentials(
        tenantId: string,
        userId: string,
    ): Promise<[string, boolean, GoogleCredential | null]> {
        try {
            this.validateObjectId(tenantId, 'tenantId');
            this.validateObjectId(userId, 'userId');

            const credManager = await this.credentialModel
                .findOne({ tenantId: new Types.ObjectId(tenantId) })
                .lean()
                .exec();

            if (!credManager) {
                return ['Credential manager not found', false, null];
            }

            if (
                !credManager.googleCredentials ||
                credManager.googleCredentials.length === 0
            ) {
                return ['No Google credentials found', false, null];
            }

            console.log('first', credManager);
            console.log('user', userId);

            const credential = credManager.googleCredentials.find(
                (c) => c.userId.toString() === userId,
            );

            if (!credential) {
                return ['Google credentials not found for user', false, null];
            }

            return ['Credentials retrieved successfully', true, credential];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async updateGoogleAccessToken(
        tenantId: string,
        userId: string,
        accessToken: string,
        refreshToken: string | null,
        expiresAt: Date,
    ): Promise<[string, boolean]> {
        try {
            this.validateObjectId(tenantId, 'tenantId');
            this.validateObjectId(userId, 'userId');

            if (!accessToken) {
                throw new Error('Access token is required');
            }

            const updateData: any = {
                'googleCredentials.$[elem].accessToken': accessToken,
                'googleCredentials.$[elem].expiresAt': expiresAt,
            };

            if (refreshToken) {
                updateData['googleCredentials.$[elem].refreshToken'] =
                    refreshToken;
            }

            const result = await this.credentialModel.updateOne(
                {
                    tenantId: new Types.ObjectId(tenantId),
                },
                {
                    $set: updateData,
                },
                {
                    arrayFilters: [
                        { 'elem.userId': new Types.ObjectId(userId) },
                    ],
                },
            );

            if (result.modifiedCount === 0) {
                return ['No credentials found to update', false];
            }

            return ['Access token updated successfully', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async revokeGoogleCredentials(
        tenantId: string,
        userId: string,
    ): Promise<[string, boolean]> {
        try {
            this.validateObjectId(tenantId, 'tenantId');
            this.validateObjectId(userId, 'userId');

            const result = await this.credentialModel.updateOne(
                {
                    tenantId: new Types.ObjectId(tenantId),
                },
                {
                    $pull: {
                        googleCredentials: {
                            userId: new Types.ObjectId(userId),
                        },
                    },
                },
            );

            if (result.modifiedCount === 0) {
                return ['No credentials found to revoke', false];
            }
            return ['Credentials revoked successfully', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    public async storeLinkedInCredentials(
        tenantId: string,
        tokenData: LinkedInTokenResponse,
        userInfo: LinkedInUserInfo,
        email: string,
        organizations: LinkedInOrganization[] | null,
    ): Promise<void> {
        const expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);
        const refreshTokenExpiryDate = new Date(
            Date.now() + tokenData.refresh_token_expires_in * 1000,
        );
        const urnId = `urn:li:person:${userInfo.sub}`;

        try {
            const updateResult = await this.credentialModel.updateOne(
                {
                    tenantId,
                    'socialCredentials.email': email,
                    'socialCredentials.urnId': urnId,
                    'socialCredentials.type': SocialType.LINKEDIN,
                },
                {
                    $set: {
                        'socialCredentials.$.accessToken':
                            tokenData.access_token,
                        'socialCredentials.$.refreshToken':
                            tokenData.refresh_token,
                        'socialCredentials.$.expiresAt': expiryDate,
                        'socialCredentials.$.refreshTokenExpiresAt':
                            refreshTokenExpiryDate,
                        'socialCredentials.$.urnId': urnId,
                        'socialCredentials.$.organizations': organizations,
                    },
                },
            );

            if (updateResult.matchedCount === 0) {
                await this.credentialModel.updateOne(
                    { tenantId },
                    {
                        $push: {
                            socialCredentials: {
                                type: SocialType.LINKEDIN,
                                accessToken: tokenData.access_token,
                                refreshToken: tokenData.refresh_token,
                                refreshTokenExpiresAt: refreshTokenExpiryDate,
                                expiresAt: expiryDate,
                                email: email,
                                urnId: urnId,
                                organizations: organizations,
                            } as LinkedInCredential,
                        },
                    },
                    { upsert: true },
                );
            }
        } catch (error) {
            throw new InternalServerErrorException(
                'Failed to store LinkedIn credentials',
                error.message,
            );
        }
    }

    async revokeLinkedInCredentials(
        tenantId: string,
        emails: string[],
    ): Promise<[string, boolean]> {
        try {
            const result = await this.credentialModel.updateOne(
                { tenantId },
                {
                    $pull: {
                        socialCredentials: {
                            type: SocialType.LINKEDIN,
                            email: { $in: emails },
                        },
                    },
                },
            );

            if (result.modifiedCount === 0) {
                return ['LinkedIn account not found', false];
            }

            return ['LinkedIn account disconnected successfully', true];
        } catch {
            return ['Failed to disconnect LinkedIn account', false];
        }
    }

    async getLinkedInAccounts(
        tenantId: string,
        isExpired: boolean | null = null,
        timezone: string,
    ): Promise<[string, boolean, LinkedInAccountsDto[] | null]> {
        try {
            const account = await this.credentialModel.findOne({
                tenantId,
            });

            if (!account) {
                return ['No accounts found', true, null];
            }

            const linkedInAccounts = account.socialCredentials
                .filter((c) => c.type === SocialType.LINKEDIN)
                .map((c) => {
                    const expires = DateTime.fromISO(
                        c.expiresAt.toISOString(),
                        { zone: timezone },
                    ).minus({ days: 1 });

                    const expired = expires < DateTime.now().setZone(timezone);

                    if (isExpired !== null && expired !== isExpired) {
                        return null;
                    }

                    return {
                        email: c.email,
                        urnId: c.urnId,
                        expiresAt: expires.toISO(),
                        isExpired: expired,
                        organizations: c.organizations || [],
                    };
                })
                .filter(Boolean);

            return ['LinkedIn accounts retrieved', true, linkedInAccounts];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async getLinkedInCredentialsInternal(
        tenantId: string,
        email?: string,
        urnId?: string,
    ) {
        const isOrgUrn = urnId?.startsWith('urn:li:organization:');
        const isPersonUrn = urnId?.startsWith('urn:li:person:');

        const elemMatch: any = {
            type: SocialType.LINKEDIN,
        };

        if (email) {
            elemMatch.email = email;
        }

        if (urnId) {
            if (isOrgUrn) {
                elemMatch['organizations.organizationId'] = urnId;
            } else if (isPersonUrn) {
                elemMatch.urnId = urnId;
            }
        }

        const account = await this.credentialModel
            .findOne({
                tenantId: new Types.ObjectId(tenantId),
                socialCredentials: { $elemMatch: elemMatch },
            })
            .lean();

        if (!account) return null;

        const credential = account.socialCredentials.find((c: any) => {
            if (c.type !== SocialType.LINKEDIN) return false;

            if (email && c.email !== email) return false;

            if (urnId) {
                if (isOrgUrn) {
                    return c.organizations?.some(
                        (org: any) => org.organizationId === urnId,
                    );
                } else if (isPersonUrn) {
                    return c.urnId === urnId;
                }
            }

            return true;
        });

        if (!credential) return null;

        const expires = DateTime.fromJSDate(credential.expiresAt).minus({
            days: 1,
        });

        const isExpired = expires < DateTime.now();

        return {
            ...credential,
            isExpired,
        };
    }

    async updateLinkedInTokens(
        tenantId: string,
        urnId: string,
        tokenData: LinkedInTokenResponse,
    ): Promise<void> {
        try {
            const now = Date.now();

            const expiresAt = new Date(now + tokenData.expires_in * 1000);

            const refreshTokenExpiresAt = tokenData.refresh_token_expires_in
                ? new Date(now + tokenData.refresh_token_expires_in * 1000)
                : undefined;

            const isOrgUrn = urnId.startsWith('urn:li:organization:');

            const updateFields: Record<string, any> = {
                'socialCredentials.$[elem].accessToken': tokenData.access_token,
                'socialCredentials.$[elem].expiresAt': expiresAt,
            };

            if (tokenData.refresh_token) {
                updateFields['socialCredentials.$[elem].refreshToken'] =
                    tokenData.refresh_token;
            }

            if (refreshTokenExpiresAt) {
                updateFields[
                    'socialCredentials.$[elem].refreshTokenExpiresAt'
                ] = refreshTokenExpiresAt;
            }

            const res = await this.credentialModel.updateOne(
                {
                    tenantId: new Types.ObjectId(tenantId),
                },
                {
                    $set: updateFields,
                },
                {
                    arrayFilters: [
                        isOrgUrn
                            ? {
                                  'elem.type': SocialType.LINKEDIN,
                                  'elem.organizations.organizationId': urnId,
                              }
                            : {
                                  'elem.type': SocialType.LINKEDIN,
                                  'elem.urnId': urnId,
                              },
                    ],
                },
            );

            if (res.matchedCount === 0) {
                throw new Error(
                    `No matching LinkedIn credential found for URN: ${urnId}`,
                );
            }
        } catch (err) {
            throw new Error(
                `Failed to update LinkedIn tokens for URN: ${urnId}`,
            );
        }
    }

    async getAccountDetailsByUrns(
        tenantId: string,
        targetUrns: string[],
    ): Promise<UpdateJobLinkedInData[]> {
        try {
            const accountDetails: UpdateJobLinkedInData[] = [];

            const account = await this.credentialModel.findOne({
                tenantId,
                'socialCredentials.type': SocialType.LINKEDIN,
            });

            if (!account) {
                return [];
            }

            for (const targetUrn of targetUrns) {
                let name = '';

                const credential = account.socialCredentials.find(
                    (cred: any) => {
                        if (cred.urnId === targetUrn) {
                            return true;
                        }

                        if (
                            cred.organizations &&
                            Array.isArray(cred.organizations)
                        ) {
                            return cred.organizations.some(
                                (org: any) => org.organizationId === targetUrn,
                            );
                        }
                        return false;
                    },
                );

                if (credential) {
                    if (credential.urnId === targetUrn) {
                        name = credential.email || 'Personal Profile';
                    } else {
                        const org = credential.organizations?.find(
                            (o: any) => o.organizationId === targetUrn,
                        );
                        name = org?.name || 'Company Page';
                    }
                }

                accountDetails.push({
                    urnId: targetUrn,
                    name: name,
                    url: null,
                });
            }

            return accountDetails;
        } catch {
            return [];
        }
    }

    async getCredentialsForTargets(
        tenantId: string,
        targetUrns: string[],
    ): Promise<Array<{ urnId: string; accessToken: string; email: string }>> {
        try {
            console.log(tenantId, targetUrns);
            const account = await this.credentialModel.findOne({
                tenantId: new Types.ObjectId(tenantId),
                'socialCredentials.type': SocialType.LINKEDIN,
            });

            if (!account) {
                return [];
            }

            const credentials = [];

            for (const targetUrn of targetUrns) {
                const cred = account.socialCredentials.find((c: any) => {
                    if (c.type !== SocialType.LINKEDIN) return false;

                    const expires = DateTime.fromJSDate(c.expiresAt).minus({
                        days: 1,
                    });
                    if (expires < DateTime.now()) return false;

                    if (c.urnId === targetUrn) return true;

                    if (c.organizations && Array.isArray(c.organizations)) {
                        return c.organizations.some(
                            (org: any) => org.organizationId === targetUrn,
                        );
                    }
                    return false;
                });

                if (cred) {
                    credentials.push({
                        urnId: targetUrn,
                        accessToken: cred.accessToken,
                        email: cred.email,
                    });
                }
            }

            return credentials;
        } catch {
            return [];
        }
    }

    async GetGoogleCalenderStatus(
        tenantId: string,
        userId: string,
    ): Promise<[string, boolean, GetGoogleCalenderStatus]> {
        try {
            this.validateObjectId(tenantId, 'tenantId');
            this.validateObjectId(userId, 'userId');

            const result = await this.credentialModel.aggregate([
                {
                    $match: {
                        tenantId: new Types.ObjectId(tenantId),
                    },
                },
                {
                    $project: {
                        googleCredentials: {
                            $filter: {
                                input: '$googleCredentials',
                                as: 'cred',
                                cond: {
                                    $eq: [
                                        '$$cred.userId',
                                        new Types.ObjectId(userId),
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $unwind: {
                        path: '$googleCredentials',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        let: { userId: '$googleCredentials.userId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$_id', '$$userId'] },
                                            {
                                                $eq: [
                                                    '$tenantId',
                                                    new Types.ObjectId(
                                                        tenantId,
                                                    ),
                                                ],
                                            },
                                            { $eq: ['$status', true] },
                                            { $eq: ['$isDeleted', false] },
                                        ],
                                    },
                                },
                            },
                            {
                                $project: {
                                    timezone: 1,
                                    roles: 1,
                                    name: 1,
                                },
                            },
                        ],
                        as: 'user',
                    },
                },
                {
                    $unwind: {
                        path: '$user',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        email: '$googleCredentials.email',
                        timezone: '$user.timezone',
                        role: '$user.roles',
                        name: '$user.name',
                        isInterviewer: {
                            $cond: {
                                if: { $isArray: '$user.roles' },
                                then: {
                                    $in: [UserRole.INTERVIEWER, '$user.roles'],
                                },
                                else: false,
                            },
                        },
                        hasCredentials: {
                            $cond: {
                                if: { $ifNull: ['$googleCredentials', false] },
                                then: true,
                                else: false,
                            },
                        },
                        expiresAt: '$googleCredentials.expiresAt',
                        userExists: {
                            $cond: {
                                if: { $ifNull: ['$user', false] },
                                then: true,
                                else: false,
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        isExpired: {
                            $cond: {
                                if: '$hasCredentials',
                                then: { $gt: ['$$NOW', '$expiresAt'] },
                                else: false,
                            },
                        },
                        googleInit: '$hasCredentials',
                    },
                },
            ]);

            const userData = result[0];

            let data: GetGoogleCalenderStatus = null;

            if (!userData.isInterviewer) {
                return ['User is not an interviewer', false, null];
            }

            if (!userData.googleInit) {
                data = {
                    googleInit: false,
                    isExpired: false,
                    name: userData.name,
                };
                return ['Success', true, data];
            }

            if (userData.isExpired) {
                data = {
                    googleInit: true,
                    isExpired: true,
                    expiryDate: DateTime.fromISO(
                        toLocal(userData.expiresAt, userData.timezone),
                    )
                        .minus({ days: 1 })
                        .toISO(),
                    name: userData.name,
                    email: userData.email,
                };
                return ['Success', true, data];
            }

            data = {
                googleInit: true,
                isExpired: false,
                expiryDate: DateTime.fromISO(
                    toLocal(userData.expiresAt, userData.timezone),
                )
                    .minus({ days: 1 })
                    .toISO(),
                name: userData.name,
                email: userData.email,
            };

            return ['Success', true, data];
        } catch (error) {
            return [error.message, false, null];
        }
    }
}
