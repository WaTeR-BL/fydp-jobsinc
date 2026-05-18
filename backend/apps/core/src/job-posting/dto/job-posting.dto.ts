import {
    IsArray,
    IsBooleanString,
    IsEnum,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { LinkedInOrganization } from '../interface/linkedin.interface';
import { LinkedInPostVisibility } from '@app/common/enums/app.enums';
import { Type } from 'class-transformer';

export class TargetUrnDto {
    @IsString()
    @IsNotEmpty()
    accessToken: string;
    @IsString()
    @IsNotEmpty()
    authorUrn: string;
}

export class AccountsQueryDto {
    @IsOptional()
    @IsBooleanString()
    isExpired?: string;
}

export class LinkedInAccountsDto {
    isExpired?: boolean;
    email?: string;
    urnId?: string;
    expiresAt?: string;
    organizations?: LinkedInOrganization[];
}

export interface MediaUploadDto {
    file: Express.Multer.File;
    title?: string;
    description?: string;
}

export interface CreatePostDto {
    text?: string;
    media?: MediaUploadDto[];
    visibility?: LinkedInPostVisibility;
    targetUrns: string[];
}

export class CreateLinkedInPostDto {
    @IsString()
    @IsOptional()
    text?: string;
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    targetUrns: string[];
    @Type(() => String)
    @IsEnum(LinkedInPostVisibility)
    visibility?: LinkedInPostVisibility;
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    mediaTitles?: string[];
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    mediaDescriptions?: string[];
}

export class AuthUrl {
    url: string;
}

export class JobPostDataDto {
    tenantId: string;
    @IsOptional()
    @IsString()
    text?: string;
    @IsArray()
    @IsNotEmpty()
    @IsString({ each: true })
    targetUrns: string[];
    @Type(() => String)
    @IsEnum(LinkedInPostVisibility)
    visibility?: LinkedInPostVisibility;
    @IsOptional()
    @Type(() => UploadedMediaDto)
    @ValidateNested({ each: true })
    @IsArray()
    media?: UploadedMediaDto[];
}

export class UploadedMediaDto {
    @IsString()
    @IsNotEmpty()
    asset: string;
    @IsString()
    @IsOptional()
    title?: string;
    @IsString()
    @IsOptional()
    description?: string;
    @IsIn(['READY', 'PROCESSING'])
    status: 'READY' | 'PROCESSING';
}
