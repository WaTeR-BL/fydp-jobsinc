import { IsBooleanString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationFilterDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    @IsBooleanString()
    read?: string;
}

export class GetNotificationDto {
    id: string;
    title: string;
    message: string;
    read: boolean;
}
