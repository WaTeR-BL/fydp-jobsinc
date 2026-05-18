import {
    IsArray,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
    ApplicationSource,
    ApplicantJobStatus,
} from '@app/common/enums/app.enums';
import { TenantApplicationGroup } from '../interface/applicant-job-feedback.interface';

export class CreateApplicantJobFeedbackDto {
    jobId: string;
    applicantId: string;
    email: string;
    cvUrl: string;
    video?: string;
    tenantId: string;
    source?: ApplicationSource;
}

export class GetAllJobApplicantDto {
    id: string;
    applicantId: string;
    jobId: string;
    applicantName: string;
    email: string;
    score: number;
    cvUrl: string;
    progress: number;
    appliedAt: string;
    video?: string;
    source?: ApplicationSource;
}

export class JobApplicantFilterDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    minScore?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    maxScore?: number;

    @IsOptional()
    @IsArray()
    @IsEnum(ApplicantJobStatus, { each: true })
    progressStatus?: number[];

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

export class MetricAnalysisDto {
    metricId: string;
    metric: string;
    percentage: number;
}

export class ApplicantDetailFilterDto {
    @IsOptional()
    @IsString()
    tenantId?: string;
    @IsOptional()
    @IsArray()
    @IsEnum(ApplicantJobStatus, { each: true })
    status?: number[];
}

export class ApplicantDetailsResponseDto {
    applicantId: string;
    email: string;
    totalTenants: number;
    totalApplications: number;
    tenants: TenantApplicationGroup[];
}

export class GetApplicantTenantDto {
    id: string;
    name: string;
}

export class GetJobApplicantDto {
    score: number;
    feedback: string;
    metricAnalysis: MetricAnalysisDto[];
    interviewId?: string;
    interviewStatus?: number;
    applicantStatus?: number;
    source?: ApplicationSource;
}

export class EvaluationResultItemDto {
    checklistId: string;
    criterion: string;
    category: string;
    score: number;
    justification: string;
    evidence: string[];
    confidence: number;
}

export class GetInterviewEvaluationDto {
    evaluationId: string;
    status: string;
    recommendation?: string;
    averageScore?: number;
    averageConfidence?: number;
    overallSummary?: string;
    evaluatedAt?: Date;
    results: EvaluationResultItemDto[];
}

export class ApplicantInterviewStatsDto {
    totalInterviews: number;
    pendingInterviews: number;
    scheduledInterviews: number;
    completedInterviews: number;
    cancelledInterviews: number;
}

export class ApplicantOverallSummaryDto {
    byStatus: Record<string, number>;
    totalInterviews: number;
    pendingInterviews: number;
    scheduledInterviews: number;
    completedInterviews: number;
    cancelledInterviews: number;
}

export class ApplicantTenantSummaryDto {
    tenantId: string;
    tenantName: string;
    totalApplications: number;
    byStatus: Record<string, number>;
    interviewStats: ApplicantInterviewStatsDto;
}

export class ApplicantSummaryResponseDto {
    applicantId: string;
    totalApplications: number;
    totalTenants: number;
    overallSummary: ApplicantOverallSummaryDto;
    tenantSummaries: ApplicantTenantSummaryDto[];
}
