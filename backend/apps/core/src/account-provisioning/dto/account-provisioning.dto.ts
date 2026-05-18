import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
} from 'class-validator';

export class TenantOnboardingDto {
    @IsString()
    @IsNotEmpty()
    companyName: string;
    @IsEmail()
    @IsNotEmpty()
    emailAddress: string;
    @IsEmail()
    @IsNotEmpty()
    contactEmail: string;
    @IsString()
    companyAddress: string;
    @IsString()
    @IsOptional()
    password: string;
    @IsString()
    @IsNotEmpty()
    fullName: string;
    @IsString()
    @IsNotEmpty()
    timezone: string;
    @IsNotEmpty()
    @IsUrl()
    websiteUrl: string;
}
