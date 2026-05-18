import { SocialType } from '@app/common/enums/app.enums';
import { Types } from 'mongoose';

export interface LinkedInOrganization {
    organizationId: string;
    name: string;
}

export interface LinkedInStatus {
    connected: boolean;
    expired?: boolean;
    email?: string;
    urnId?: string;
    expiresAt?: Date;
    organizations?: LinkedInOrganization[];
}

export interface LinkedInCredential {
    type: SocialType;
    accessToken: string;
    expiresAt: Date;
    isExpired: boolean;
    email: string;
    urnId: string;
    refreshToken?: string;
    refreshTokenExpiresAt?: Date;
    organizations?: LinkedInOrganization[];
}

export interface SocialAggregator {
    tenantId: string;
    credentials: LinkedInCredential[];
}

export interface LinkedInTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
    scope?: string;
    token_type?: string;
}
export interface LinkedInUserInfo {
    sub: string;
    name: string;
    email: string;
    picture?: string;
}

export interface LinkedInAccountInfo {
    email: string;
    urnId: string;
    organizations?: LinkedInOrganization[];
}

export interface PostResult {
    targetUrn: string;
    success: boolean;
    message: string;
    postId?: string;
    error?: any;
}

export interface UploadedMedia {
    _id?: Types.ObjectId;
    asset: string;
    status: 'READY' | 'PROCESSING';
    title?: string;
    description?: string;
}
