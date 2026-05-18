import {
    IsArray,
    IsBoolean,
    IsBooleanString,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDomainDto {
    @IsArray()
    tags?: string[];

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    description?: string;

    @IsBoolean()
    @IsNotEmpty()
    status: boolean;
}

export class GetDomainDto {
    id: string;
    title: string;
    description: string;
    status: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export class UpdateDomainDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsBoolean()
    status?: boolean;
}

export class DomainFilterDto {
    @IsOptional()
    @IsBooleanString()
    status?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
