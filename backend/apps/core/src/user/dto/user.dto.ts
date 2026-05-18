import {
    IsArray,
    IsBoolean,
    IsBooleanString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { UserRole } from '@app/common/enums/app.enums';
import { Transform } from 'class-transformer';

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    emailAddress: string;
    @IsNotEmpty()
    @IsString()
    timezone: string;
    @IsNotEmpty()
    @IsString()
    name: string;
    @IsNotEmpty()
    @IsString()
    password?: string;
    @IsBoolean()
    @IsNotEmpty()
    enable2FA: boolean;
    @IsNotEmpty()
    @IsArray()
    @IsEnum(UserRole, { each: true })
    roles: UserRole[];
}

export class GetAllTenantEmployeeDto {
    id: string;
    fullName: string;
    emailAddress: string;
    roles: string[];
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export class GetTenantEmployeeDto {
    id: string;
    fullName: string;
    emailAddress: string;
    roles: string[];
    status: boolean;
    avatarUrl?: string;
    createdAt: string;
    updatedAt: string;
    isGoogleInitialized?: boolean;
    isGoogleExpired?: boolean;
    tenantName?: string;
    tenantLogoUrl?: string;
    timezone: string;
}

export class Update2FAQueryDto {
    @IsNotEmpty()
    @IsBooleanString()
    status: string;

    @IsOptional()
    @IsString()
    code?: string;
}

export class EmployeeFilterDto {
    @IsOptional()
    @IsBooleanString()
    status?: string;

    @IsOptional()
    @IsArray()
    @IsEnum(UserRole, { each: true })
    userRole?: number[];

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;
}

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    name?: string;
    @IsOptional()
    @IsString()
    timezone?: string;
}

export class ResetPasswordDto {
    @IsNotEmpty()
    @IsString()
    token: string;
    @IsNotEmpty()
    @IsString()
    email: string;
    @IsNotEmpty()
    @IsString()
    newPassword: string;
}
