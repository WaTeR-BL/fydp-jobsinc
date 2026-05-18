import { AIResponseInterface } from '@app/common/interface/ai-analysis-payload.interface';

export interface ApplicantStatusInterface {
    applicantJobId?: string;
    message: string;
    success: boolean;
    contact: string;
    tenantBusinessId: string;
    tenantLiveContact: string;
    feedback?: AIResponseInterface;
}

export interface ApplicantInterviewStatusInterface {
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    companyName: string;
    jobTitle: string;
    link: string;
    tenantBusinessId: string;
    tenantWhatsappAccessToken?: string;
}
