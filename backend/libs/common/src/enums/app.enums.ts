export enum VerificationStatus {
    PENDING = 0,
    VERIFIED = 1,
    REJECTED = 2,
}

export enum AuthProvider {
    LOCAL = 0,
    GOOGLE = 1,
}

export enum UserRole {
    SUPER_ADMIN = 0,
    ADMIN = 1,
    MANAGER = 2,
    INTERVIEWER = 3,
}

export enum PlanType {
    TIER = 0,
    ADDON = 1,
    PAY_AS_YOU_GO = 2,
    PROMPT = 3,
}

export enum SubscriptionStatus {
    ACTIVE = 0,
    PAST_DUE = 1,
    CANCELED = 2,
}

export enum PayGType {
    CV = 0,
    REMINDER_MESSAGE = 1,
}

export enum PaymentStatus {
    PENDING = 0,
    SUCCESS = 1,
    FAILED = 2,
}

export enum JobStatus {
    OPEN = 0,
    DRAFT = 1,
    CLOSED = 2,
}

export enum ApplicantJobStatus {
    PENDING = 0,
    ANALYZED = 1,
    REJECT = 2,
    ACCEPT = 3,
    INTERVIEW = 4,
}

export enum SocialType {
    LINKEDIN = 0,
}

export enum LinkedInPostVisibility {
    PUBLIC = 'PUBLIC',
    CONNECTIONS = 'CONNECTIONS',
    LOGGED_IN = 'LOGGED_IN',
}

export enum LinkedInMediaCategory {
    NONE = 'NONE',
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    ARTICLE = 'ARTICLE',
}

export enum InterviewStatus {
    PENDING = 0,
    SCHEDULED = 1,
    RESCHEDULED = 2,
    COMPLETED = 3,
    CANCELLED = 4,
    NO_SHOW = 5,
    CONFIRMATION = 6,
}

export enum InterviewType {
    ONLINE = 0,
    ONSITE = 1,
}

export enum EmailTemplate {
    ACCEPT = 'accept',
    REJECT = 'reject',
    INTERVIEW = 'interview',
    RESET_PASSWORD = 'resetPassword',
    APPLICANT_USER_CREATION = 'applicantUserCreation',
    INTERVIEW_ASSIGNMENT = 'interviewAssignment',
}

export enum AuthUserType {
    TENANT = 'TENANT',
    GLOBAL = 'GLOBAL',
}

export enum WebhookEventStatus {
    RECEIVED = 0,
    PROCESSED = 1,
    FAILED = 2,
}

export enum RoundOutcome {
    PASSED = 'passed',
    FAILED = 'failed',
    ON_HOLD = 'on_hold',
}

export enum DbType {
    POSTGRESQL = 'postgresql',
    MYSQL = 'mysql',
    MSSQL = 'mssql',
    ORACLE = 'oracle',
    MONGODB = 'mongodb',
}

export enum ExtraFieldType {
    TEXT = 'text',
    NUMBER = 'number',
    DATE = 'date',
    SELECT = 'select',
}

export enum RelationType {
    ONE_TO_MANY = 'one-to-many',
    MANY_TO_MANY = 'many-to-many',
}

export enum IntegrationExecutionStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export enum ApplicationSource {
    WHATSAPP = 'whatsapp',
    EMAIL = 'email',
}

export enum ApplicationChannel {
    WHATSAPP = 'whatsapp',
    EMAIL = 'email',
}
