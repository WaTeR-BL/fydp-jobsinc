import { ApplicationSource } from '../enums/app.enums';

export interface ApplicantInterface {
    fullName: string;
    contactNo: string;
    email: string;
    cvUrl: string;
    videoPath?: string;
    jobId: string;
    tenantId: string;
    tenantBusinessId: string;
    tenantLiveContact: string;
    timezone?: string;
    source?: ApplicationSource;
}
