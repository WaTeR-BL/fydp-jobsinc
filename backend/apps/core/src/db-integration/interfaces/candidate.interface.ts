/**
 * A unified snapshot of a hired candidate assembled at sync time
 * from Applicant + ApplicantJobFeedback + Job documents.
 *
 * Keys in this interface are used as `sourceField` values in ColumnMapping
 * so that HR can map them to their external DB columns during config setup.
 */
export interface Candidate {
    // From Applicant
    fullName: string;
    email: string;
    contact?: string;
    timezone?: string;

    // From ApplicantJobFeedback
    cvUrl: string;
    cvMatch?: number;
    feedback?: string;
    applicantId: string;
    feedbackId: string;
    tenantId: string;
    jobId: string;

    // From Job
    jobTitle?: string;
}
