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
  status: number;
  interviewType: number;
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
  timeSlotId?: string;
}

export interface ApplicationDetail {
  applicationId: string;
  jobId: string;
  jobTitle?: string;
  applicantStatus: number;
  statusLabel?: string;
  feedback?: string;
  cvMatch?: number;
  cvUrl: string;
  video?: string;
  isProcessCompleted: boolean;
  analysis?: any[];
  createdAt?: string;
  updatedAt?: string;
  interviewDetails?: InterviewDetails;
}

export interface TenantApplicationGroup {
  tenantId: string;
  tenantName?: string;
  totalApplications: number;
  applications: ApplicationDetail[];
}

export interface ApplicantDetailsResponse {
  applicantId: string;
  email: string;
  totalTenants: number;
  totalApplications: number;
  tenants: TenantApplicationGroup[];
}

export interface ApplicantInterviewStats {
  totalInterviews: number;
  pendingInterviews: number;
  scheduledInterviews: number;
  completedInterviews: number;
  cancelledInterviews: number;
}

export interface ApplicantTenantSummary {
  tenantId: string;
  tenantName: string;
  totalApplications: number;
  byStatus: Record<string, number>;
  interviewStats: ApplicantInterviewStats;
}

export interface ApplicantOverallSummary {
  byStatus: Record<string, number>;
  totalInterviews: number;
  pendingInterviews: number;
  scheduledInterviews: number;
  completedInterviews: number;
  cancelledInterviews: number;
}

export interface ApplicantSummaryResponse {
  applicantId: string;
  totalApplications: number;
  totalTenants: number;
  overallSummary: ApplicantOverallSummary;
  tenantSummaries: ApplicantTenantSummary[];
}

export interface ApplicantTenant {
  id: string;
  name: string;
}

export interface ApplicantDetailFilter {
  tenantId?: string;
  status?: number[];
}

export interface ScheduleInterviewRequest {
  assignmentId: string;
  timeSlotId: string;
}
