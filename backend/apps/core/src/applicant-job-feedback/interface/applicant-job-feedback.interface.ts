import {
    ApplicationSource,
    ApplicantJobStatus,
    InterviewStatus,
    InterviewType,
} from '@app/common/enums/app.enums';
import { Types } from 'mongoose';

export interface TimeSlotInfo {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
}

export interface InterviewerInfo {
    interviewerId: string;
    interviewerName?: string;
    email?: string;
    userId?: string;
}

export interface InterviewDetails {
    interviewId: string;
    status: InterviewStatus;
    interviewType: InterviewType;
    interviewTypeLabel: string;
    interviewStatusLabel: string;
    scheduledAt?: string;
    scheduledEndTime?: string;
    duration?: number;
    isCompleted: boolean;
    completedAt?: string;
    rescheduleCount: number;
    interviewer?: InterviewerInfo;
    availableTimeSlots?: TimeSlotInfo[];
    meetLink?: string;
    onsiteLocation?: string;
    onsiteAddress?: string;
    onsiteInstructions?: string;
    attendees?: string[];
    notes?: string;
    cancellationReason?: string;
    cancelledAt?: string;
    cancelledBy?: string;
}

export interface ApplicationDetail {
    applicationId: string;
    jobId: string;
    jobTitle?: string;
    applicantStatus: ApplicantJobStatus;
    statusLabel?: string;
    isProcessCompleted: boolean;
    createdAt?: string;
    updatedAt?: string;
    interviewDetails?: InterviewDetails;
    source?: ApplicationSource;
}

export interface TenantApplicationGroup {
    tenantId: string;
    tenantName?: string;
    totalApplications: number;
    applications: ApplicationDetail[];
}

export interface ApplicantSummaryAggregationResult {
    tenantId: Types.ObjectId;
    tenantName?: string;
    totalApplications: number;
    byStatus: Record<string, number>;
    interviewStats: {
        totalInterviews: number;
        pendingInterviews: number;
        scheduledInterviews: number;
        completedInterviews: number;
        cancelledInterviews: number;
    };
}
