import { Types } from 'mongoose';
import { GetJobPostDataDto, LinkedInPostInfo, MetricDto } from '../dto/job.dto';
import { UploadedMedia } from '../../job-posting/interface/linkedin.interface';
import { LinkedInPostVisibility } from '@app/common/enums/app.enums';
import { InterviewRoundConfig } from '@app/common';

export interface GetJobDocument {
    _id: Types.ObjectId;
    title: string;
    filename: string;
    filepath: string;
    jobVerificationCode: string;
    url: string;
    jobStatus: number;
    startDate?: Date;
    endDate?: Date;
    domainId: any;
    linkedInStatus: boolean;
    linkedInPostInfo?: LinkedInPostInfo[];
    metrics?: MetricDto[];
    interviewPipeline?: InterviewRoundConfig[];
    enableJobPosting: boolean;
    postData?: GetJobPostDataDto;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateJobLinkedInData {
    urnId: string;
    name: string;
    url: string;
}

export interface JobPostData {
    tenantId: string;
    media?: UploadedMedia[];
    text?: string;
    visibility: LinkedInPostVisibility;
    targetUrns: string[];
}
