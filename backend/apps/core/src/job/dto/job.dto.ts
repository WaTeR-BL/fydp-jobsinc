import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsISO8601,
    IsMongoId,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
    ApplicationChannel,
    InterviewType,
    JobStatus,
    LinkedInPostVisibility,
} from '@app/common/enums/app.enums';
import { Types } from 'mongoose';
import { UploadedMedia } from '../../job-posting/interface/linkedin.interface';
import { HasTimezone } from '../../common/validator/timezone.validator';

export class CreateMetricDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsNotEmpty()
    @IsBoolean()
    status: boolean;
}

export class ScoringDto {
    @IsNotEmpty()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    min: number;

    @IsNotEmpty()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    max: number;

    @IsNotEmpty()
    @IsObject()
    anchors: Record<number, string>;
}

export class CreateCheckListDto {
    @IsNotEmpty()
    @IsString()
    criterion: string;

    @IsNotEmpty()
    @IsString()
    category: string;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => ScoringDto)
    scoring: ScoringDto;

    @IsOptional()
    @IsBoolean()
    enabled?: boolean;
}

export class UpdateMetricDto {
    @IsMongoId()
    id: string;
    @IsOptional()
    @IsString()
    title?: string;
    @IsOptional()
    @IsString()
    description?: string;
    @IsOptional()
    @IsBoolean()
    status?: boolean;
}

export class UpdateCheckListDto {
    @IsMongoId()
    id: string;

    @IsOptional()
    @IsString()
    criterion?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => ScoringDto)
    scoring?: ScoringDto;

    @IsOptional()
    @IsBoolean()
    enabled?: boolean;
}

export class CreateInterviewRoundConfigDto {
    @IsNotEmpty()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    roundNumber: number;

    @IsNotEmpty()
    @IsString()
    roundName: string;

    @IsNotEmpty()
    @IsEnum(InterviewType)
    interviewType: InterviewType;

    @IsOptional()
    @Type(() => CreateCheckListDto)
    @ValidateNested({ each: true })
    @IsArray()
    checkLists?: CreateCheckListDto[];

    @IsOptional()
    @IsString()
    defaultInterviewerId?: string;

    @IsOptional()
    @IsBoolean()
    isOptional?: boolean;
}

export class UpdateInterviewRoundConfigDto {
    @IsOptional()
    @IsString()
    _id?: string;

    @IsNotEmpty()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    roundNumber: number;

    @IsNotEmpty()
    @IsString()
    roundName: string;

    @IsNotEmpty()
    @IsEnum(InterviewType)
    interviewType: InterviewType;

    @IsOptional()
    @Type(() => CreateCheckListDto)
    @ValidateNested({ each: true })
    @IsArray()
    checkLists?: CreateCheckListDto[];

    @IsOptional()
    @IsString()
    defaultInterviewerId?: string;

    @IsOptional()
    @IsBoolean()
    isOptional?: boolean;
}

export class JobFilterDto {
    @IsOptional()
    @IsISO8601({ strict: true })
    @HasTimezone({ message: 'Timezone is required' })
    from?: string;

    @IsOptional()
    @IsISO8601({ strict: true })
    @HasTimezone({ message: 'Timezone is required' })
    to?: string;

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    domainId?: string[];

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    jobStatus?: boolean;

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

export class GetMetricDto {
    id: string;
    title: string;
    description: string;
    status: boolean;
}

export class MetricDto {
    _id: Types.ObjectId;
    title: string;
    description: string;
    status: boolean;
}

export class LinkedPostInfoDto {
    name: string;
    url: string;
    postedAt: Date;
    urnId: string;
}

export class GetScoringDto {
    min: number;
    max: number;
    anchors: Record<number, string>;
}

export class GetCheckListDto {
    id: string;
    criterion: string;
    category: string;
    scoring: GetScoringDto;
    enabled: boolean;
}

export class GetLinkedInPostDataDto {
    name: string;
    url: string;
    postedAt: string;
}

export class CheckListDto {
    _id: Types.ObjectId;
    criterion: string;
    category: string;
    scoring: {
        min: number;
        max: number;
        anchors: Record<number, string>;
    };
    enabled: boolean;
}

export class LinkedInPostInfo {
    urnId: string;
    url: string;
    name: string;
    postedAt: Date;
}

export class GetJobDto {
    id: string;
    title: string;
    filename: string;
    filepath: string;
    jobStatus: number;
    jobStatusName: string;
    mediaUrl: string;
    metrics: GetMetricDto[];
    jobVerificationCode: string;
    start?: string;
    end?: string;
    domainId?: string;
    domainTitle?: string;
    interviewPipeline?: any[];
    createdAt: string;
    updatedAt: string;
    linkedInStatus: boolean;
    enableJobPosting: boolean;
    jobPostData: GetJobPostDataDto;
    linkedInPostData: GetLinkedInPostDataDto[];
}

export class GetJobPostDataDto {
    tenantId: string;
    media?: UploadedMedia[];
    text?: string;
    visibility: LinkedInPostVisibility;
    targetUrns: string[];
}

export class GetAllJobDto {
    id: string;
    title: string;
    domainTitle: string;
    jobStatusName: string;
    start?: string;
    end?: string;
    createdAt: string;
    updatedAt: string;
    linkedInStatus: boolean;
}

export class UpdateJobDto {
    @IsOptional()
    @IsString()
    title: string;

    @IsOptional()
    @Type(() => Number)
    @IsEnum(JobStatus)
    jobStatus?: JobStatus;

    @IsOptional()
    @IsISO8601({ strict: true })
    @HasTimezone({ message: 'Timezone is required' })
    start?: string;

    @IsOptional()
    @IsISO8601({ strict: true })
    @HasTimezone({ message: 'Timezone is required' })
    end?: string;

    @IsOptional()
    @IsMongoId()
    domainId?: string;

    @IsOptional()
    @Type(() => UpdateInterviewRoundConfigDto)
    @ValidateNested({ each: true })
    @IsArray()
    interviewPipeline?: UpdateInterviewRoundConfigDto[];
}

export class CreateJobDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @Type(() => Number)
    @IsEnum(JobStatus)
    jobStatus?: JobStatus;

    @IsNotEmpty()
    @IsString()
    domainId: string;

    @IsOptional()
    @IsISO8601({ strict: true })
    @HasTimezone({ message: 'Timezone is required' })
    start?: string;

    @IsOptional()
    @IsISO8601({ strict: true })
    @HasTimezone({ message: 'Timezone is required' })
    end?: string;

    @Type(() => CreateMetricDto)
    @ValidateNested({ each: true })
    @ArrayNotEmpty()
    @IsArray()
    metrics: CreateMetricDto[];

    @IsOptional()
    @Type(() => CreateInterviewRoundConfigDto)
    @ValidateNested({ each: true })
    @IsArray()
    interviewPipeline?: CreateInterviewRoundConfigDto[];

    @IsNotEmpty()
    @IsString()
    jobVerificationCode: string;

    @IsArray()
    @IsEnum(ApplicationChannel, { each: true })
    @ArrayNotEmpty()
    applicationChannels: ApplicationChannel[];
}

export class UpdatePostDataDto {
    @IsOptional()
    @IsString()
    text?: string;

    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    targetUrns?: string[];

    @IsOptional()
    @IsEnum(LinkedInPostVisibility)
    visibility?: LinkedInPostVisibility;
}
