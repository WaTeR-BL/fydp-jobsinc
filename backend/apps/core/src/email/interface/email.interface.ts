import {
    AuthUserType,
    EmailTemplate,
    InterviewType,
} from '@app/common/enums/app.enums';

/**
 * Explicit SMTP credentials — highest priority transport.
 * Pass this when the sender is jobsinc itself (env-based creds)
 * or for any other case where you want to bypass the DB lookup.
 */
export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromName: string;
}

export interface SendEmail {
    fromEmail: string;
    fromName: string;
    toEmail: string;
    emailType: EmailTemplate;
    /**
     * When provided, used for:
     *   1. Custom template resolution (DB lookup)
     *   2. SMTP transport lookup (tenant's mailbox config)
     */
    tenantId?: string;
    /**
     * Explicit SMTP config — takes priority over tenantId DB lookup.
     * Use this when sending as jobsinc (env creds) or for custom overrides.
     */
    smtpConfig?: SmtpConfig;
    applicantName?: string;
    jobTitle?: string;
    startDate?: string;
    salary?: string;
    feedback?: string;
    interviewDate?: string;
    interviewTime?: string;
    interviewLocation?: string;
    interviewType?: InterviewType;
    meetingLink?: string;
    companyName?: string;
    logoUrl?: string;
    websiteUrl?: string;
    companyEmail?: string;
    interviewerEmail?: string;
    userType?: AuthUserType;
    resetLink?: string;
    name?: string;
    password?: string;
    applicantEmail?: string;
    portalLink?: string;
}

export interface EmailHelperData {
    fromEmail: string;
    fromName: string;
    toEmail: string;
    applicantName: string;
    jobTitle: string;
    tenantId?: string;
    companyName?: string;
    logoUrl?: string;
    websiteUrl?: string;
    companyEmail: string;
    feedback?: string;
    salary?: string;
    startDate?: Date;
}

export interface EmailVerificationResponse {
    valid: boolean;
    result: string;
    deliverabilityScore: number;
    isDisposable: boolean;
    domain: string;
    reason?: string;
}
