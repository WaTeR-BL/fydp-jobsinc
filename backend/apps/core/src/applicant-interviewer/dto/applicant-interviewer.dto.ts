import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsEmail,
    IsEnum,
    IsISO8601,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { InterviewStatus, InterviewType } from '@app/common/enums/app.enums';
import { HasTimezone } from '../../common/validator/timezone.validator';

export class AssignInterviewerDto {
    @IsString()
    @IsNotEmpty()
    applicantJobFeedbackId: string;

    @IsString()
    @IsNotEmpty()
    interviewerId: string;

    @IsEnum(InterviewType)
    @IsNotEmpty()
    interviewType: InterviewType;

    @IsNumber()
    @Min(1)
    roundNumber: number;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    onsiteLocation?: string;

    @IsOptional()
    @IsString()
    onsiteAddress?: string;

    @IsOptional()
    @IsString()
    onsiteInstructions?: string;
}

export class InterviewAssignmentResponseDto {
    assignmentId: string;
    interviewerId: string;
    interviewType: InterviewType;
    availableSlots: TimeSlotResponseDto[];
}

export class ScheduleInterviewDto {
    @IsString()
    @IsNotEmpty()
    assignmentId: string;

    @IsString()
    @IsNotEmpty()
    timeSlotId: string;
}

export class InterviewScheduleResponseDto {
    interviewId: string;
    interviewType: InterviewType;
    scheduledAt: Date;
    scheduledEndTime: Date;
    meetLink?: string;
    onsiteLocation?: string;
    onsiteAddress?: string;
    emailSent: boolean;
}

export class RescheduleInterviewDto {
    @IsString()
    @IsNotEmpty()
    tenantId: string;

    @IsString()
    @IsNotEmpty()
    newTimeSlotId: string;

    @IsEnum(InterviewType)
    @IsNotEmpty()
    interviewType: InterviewType;

    @IsArray()
    @ArrayMinSize(1)
    @IsEmail({}, { each: true })
    emails: string[];

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    onsiteLocation?: string;

    @IsOptional()
    @IsString()
    onsiteAddress?: string;

    @IsOptional()
    @IsString()
    onsiteInstructions?: string;
}

export class CancelInterviewDto {
    @IsString()
    @IsNotEmpty()
    tenantId: string;

    @IsString()
    @IsNotEmpty()
    reason: string;

    @IsOptional()
    @IsString()
    cancelledBy?: string;
}

export class CompleteInterviewDto {
    @IsString()
    @IsNotEmpty()
    tenantId: string;

    @IsOptional()
    @IsString()
    feedback?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(5)
    rating?: number;

    @IsOptional()
    @IsBoolean()
    applicantAttended?: boolean;
}

export class InterviewDetailsDto {
    id: string;
    applicantJobFeedbackId: string;
    interviewerId: string;
    interviewType: InterviewType;
    status: InterviewStatus;
    scheduledAt: Date;
    scheduledEndTime?: Date;
    attendees: string[];
    meetLink?: string;
    onsiteLocation?: string;
    onsiteAddress?: string;
    duration?: number;
    notes?: string;
    rescheduleCount: number;
    cancellationReason?: string;
    cancelledAt?: Date;
    completedAt?: Date;
    isCompleted: boolean;
    emailSent: boolean;
}

export class TimeSlotResponseDto {
    timeSlotId: string;
    startTime: string;
    endTime: string;
    selected: boolean;
    interviewId?: string;
    selectedAt?: Date;
}

export class EventFilterDto {
    @IsOptional()
    @IsISO8601({ strict: true })
    @HasTimezone({ message: 'Timezone is required' })
    from?: string;

    @IsOptional()
    @IsISO8601({ strict: true })
    @HasTimezone({ message: 'Timezone is required' })
    to?: string;

    @IsEnum(InterviewType)
    @IsOptional()
    interviewType?: InterviewType;

    @IsEnum(InterviewStatus)
    @IsOptional()
    status?: InterviewStatus;

    @IsOptional()
    @IsString()
    userId?: string;
}

export class GetEventDto {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    interviewType: string;
}

export class GetEventDetailDto {
    id: string;
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    status: string;
    applicantName: string;
    jobTitle: string;
    meetLink?: string;
    location: string;
    interviewType: string;
    timeSlotId?: string | null;
    feedbackId?: string | null;
    jobId?: string | null;
}

export class RejectCandidateDto {
    @IsOptional()
    @IsString()
    notes?: string;
}

export class SkipRoundDto {
    @IsNumber()
    @Min(1)
    roundNumber: number;
}
