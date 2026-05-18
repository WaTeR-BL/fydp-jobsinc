import {
    IsArray,
    IsBoolean,
    IsDate,
    IsISO8601,
    IsNotEmpty,
    IsNumber,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HasTimezone } from '../../common/validator/timezone.validator';

export class CreateTimeSlotDto {
    @IsNotEmpty()
    @IsISO8601({ strict: true })
    @HasTimezone({ message: 'Timezone is required' })
    startTime: string;

    @IsNotEmpty()
    @IsISO8601({ strict: true })
    @HasTimezone({ message: 'Timezone is required' })
    endTime: string;

    @IsNotEmpty()
    @IsBoolean()
    reserved: boolean;
}

export class TimeSlotDto {
    @IsString()
    timeSlotId: string;
    @IsDate()
    startTime: string;
    @IsDate()
    endTime: string;
    @IsBoolean()
    selected: boolean;
    @IsBoolean()
    reserved: boolean;
}

export class GetTimeSlotDto {
    @IsString()
    interviewerId: string;
    @IsString()
    name?: string;
    @IsString()
    tenantId: string;
    @IsString()
    userId: string;
    @IsNumber()
    count?: number;
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TimeSlotDto)
    timeSlots: TimeSlotDto[];
}
