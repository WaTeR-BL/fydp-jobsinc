import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;
    @IsString()
    @IsNotEmpty()
    password: string;
    @IsString()
    @IsOptional()
    code?: string;
}

export class UserDetailDto {
    name?: string;
    email?: string;
    roles?: number[];
    accessToken?: string;
    refreshToken?: string;
    avatarUrl?: string;
    isGoogleInitialized?: boolean;
    isGoogleExpired?: boolean;
    tenantName?: string;
    tenantLogoUrl?: string;
    qrcode?: string;
    requiresSetup?: boolean;
    requires2FA?: boolean;
    is2FAEnabled: boolean;
}

export class ApplicantDetailDto {
    name: string;
    email: string;
    accessToken: string;
    refreshToken: string;
}

export class Initialize2FADto {
    @IsEmail()
    @IsNotEmpty()
    email: string;
    @IsString()
    @IsNotEmpty()
    password: string;
}

export class Verify2FADto {
    @IsEmail()
    @IsNotEmpty()
    email: string;
    @IsString()
    @IsNotEmpty()
    password: string;
    @IsString()
    @IsNotEmpty()
    code: string;
}

export interface Initialize2FAResponse {
    qrCode: string;
    secret: string;
    email: string;
}
