export interface InterviewConfirmationResult {
    interviewId: string;
    meetId: string;
    meetLink: string;
    scheduledAt: Date;
}

export interface MeetEventData {
    meetId: string;
    link: string;
    hangoutLink?: string;
}

export interface ApplicantInterviewData {
    applicantName: string;
    applicantEmail: string;
    interviewType: string;
    scheduledAt: Date;
    scheduledEndTime: Date;
    interviewerName: string;
    location?: string;
    address?: string;
    instructions?: string;
    meetLink?: string;
    companyName: string;
}

export interface InterviewHelperData {
    jobTitle: string;
    tenantBusinessId: string;
    applicantPhone: string;
    tenant: string;
    userId: string;
    applicantEmail: string;
    applicantName: string;
    interviewerName: string;
    interviewerEmail: string;
    assignedBy?: string;
    tenantAddress: string;
    tenantSesEmail: string;
    contactEmail: string;
    logoUrl: string;
    websiteUrl: string;
    timezone: string;
}
