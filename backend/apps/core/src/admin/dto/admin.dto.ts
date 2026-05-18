import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    MinLength,
} from 'class-validator';

export class TenantFilterDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}

export class UpdateTenantStatusDto {
    @IsBoolean()
    status: boolean;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class UpdateBusinessIdDto {
    @IsString()
    @IsNotEmpty()
    businessId: string;
}

export class ToggleWhatsappManagedDto {
    @IsBoolean()
    active: boolean;
}

export class CreateAdminUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    emailAddress: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password: string;

    @IsString()
    @IsNotEmpty()
    timezone: string;
}

export class UpdateAdminUserStatusDto {
    @IsBoolean()
    status: boolean;
}

export class TenantGrowthPointDto {
    month: string;
    count: number;
}

export class AdminDashboardTenantsDto {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
}

export class AdminDashboardDto {
    tenants: AdminDashboardTenantsDto;
    totalUsers: number;
    totalActiveJobs: number;
    totalApplicants: number;
    activeSubscriptions: number;
    tenantGrowthChart: TenantGrowthPointDto[];
}

export class TenantListItemDto {
    id: string;
    name: string;
    domain: string;
    contactEmail: string;
    status: boolean;
    subscriptionStatus: string | null;
    userCount: number;
    jobCount: number;
    createdAt: Date;
}

export class TenantSubscriptionInfoDto {
    status: string | null;
    whatsappManagedActive: boolean;
    cvUsed: number;
    remindersUsed: number;
    evalBlocksUsed: number;
    currentPeriodEnd: Date | null;
}

export class TenantDetailDto {
    id: string;
    name: string;
    domain: string;
    contactEmail: string;
    logoUrl: string | null;
    websiteUrl: string;
    address: string | null;
    status: boolean;
    slaDays: number;
    businessId: string | null;
    userCount: number;
    jobCount: number;
    applicantCount: number;
    createdAt: Date;
    subscription: TenantSubscriptionInfoDto | null;
}

export class AdminUserDto {
    id: string;
    name: string;
    emailAddress: string;
    status: boolean;
    createdAt: Date;
}
