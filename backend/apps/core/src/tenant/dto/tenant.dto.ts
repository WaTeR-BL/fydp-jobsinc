import {
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    Min,
} from 'class-validator';

export class WhatsappConfigDto {
    @IsString()
    @IsNotEmpty()
    phoneNumberId: string;

    @IsString()
    @IsNotEmpty()
    businessId: string;

    @IsString()
    @IsNotEmpty()
    accessToken: string;
}

export class WhatsappNumberDto {
    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @IsString()
    @IsOptional()
    healthCheckNumber?: string;
}

export class CreateTenantDto {
    @IsString()
    @IsNotEmpty()
    name: string;
    @IsNotEmpty()
    @IsEmail()
    emailAddress: string;
    @IsString()
    address: string;
    @IsUrl()
    websiteUrl: string;
    @IsNotEmpty()
    @IsEmail()
    contactEmail: string;
    @IsString()
    @IsOptional()
    logoUrl?: string;
    @IsString()
    domain: string;
}

export class UpdateTenantDto {
    @IsString()
    @IsOptional()
    companyName?: string;
    @IsString()
    @IsOptional()
    companyAddress?: string;
    @IsUrl()
    @IsOptional()
    websiteUrl?: string;
    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    slaDays?: number;
}

export class GetTenantDto {
    name: string;
    emailAddress: string;
    googleAuthorized: boolean;
    sesEmail: string;
    contactEmail: string;
    logoUrl: string;
    slaDays: number;
    status: boolean;
}
