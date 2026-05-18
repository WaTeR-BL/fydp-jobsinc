import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    tenantId: string;

    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    timeSlotId: string;

    @IsString()
    @IsNotEmpty()
    applicantJobFeedbackId: string;

    @IsDateString()
    @IsNotEmpty()
    startTime: string;

    @IsDateString()
    @IsNotEmpty()
    endTime: string;

    @IsOptional()
    @IsString()
    summary?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    timeZone?: string;

    @IsNotEmpty()
    @IsString()
    applicantEmail: string;

    @IsNotEmpty()
    @IsString()
    applicantName: string;

    @IsNotEmpty()
    @IsString()
    interviewerName: string;

    @IsNotEmpty()
    @IsString()
    interviewerEmail: string;
}

export class UpdateEventDto {
    @IsDateString()
    @IsNotEmpty()
    startTime: string;

    @IsDateString()
    @IsNotEmpty()
    endTime: string;

    @IsArray()
    @ArrayMinSize(1)
    @IsEmail({}, { each: true })
    emails: string[];

    @IsOptional()
    @IsString()
    summary?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    timeZone?: string;

    @IsNotEmpty()
    @IsString()
    applicantEmail: string;

    @IsNotEmpty()
    @IsString()
    applicantName: string;
}
