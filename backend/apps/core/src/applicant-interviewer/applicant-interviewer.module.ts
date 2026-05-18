import { Module } from '@nestjs/common';
import { ApplicantInterviewerService } from './applicant-interviewer.service';
import { ApplicantInterviewerController } from './applicant-interviewer.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
    ApplicantInterview,
    ApplicantInterviewSchema,
} from '@app/common/schemas/applicant-interview.schema';
import {
    ApplicantJobFeedback,
    ApplicantJobFeedbackSchema,
} from '@app/common/schemas/applicant-job-feedback.schema';
import { Job, JobSchema } from '@app/common/schemas/job.schema';
import { Tenant, TenantSchema } from '@app/common/schemas/tenant.schema';
import {
    InterviewEvaluation,
    InterviewEvaluationSchema,
} from '@app/common/schemas/interview-evaluation.schema';
import {
    InterviewRecording,
    InterviewRecordingSchema,
} from '@app/common/schemas/interview-recording.schema';
import {
    InterviewTranscript,
    InterviewTranscriptSchema,
} from '@app/common/schemas/interview-transcript.schema';
import { GoogleCalendarModule } from '../google-calender/google-calendar.module';
import { InterviewerModule } from '../interviewer/interviewer.module';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { RMQ_CONSTANTS, RmqModule } from '@app/common';
import { ApplicantJobFeedbackModule } from '../applicant-job-feedback/applicant-job-feedback.module';
import { ApplicantModule } from '../applicant/applicant.module';
import { BillingModule } from '../billing/billing.module';
import { DbIntegrationModule } from '../db-integration/db-integration.module';

@Module({
    providers: [ApplicantInterviewerService],
    controllers: [ApplicantInterviewerController],
    imports: [
        MongooseModule.forFeature([
            {
                name: ApplicantInterview.name,
                schema: ApplicantInterviewSchema,
            },
            {
                name: ApplicantJobFeedback.name,
                schema: ApplicantJobFeedbackSchema,
            },
            {
                name: Job.name,
                schema: JobSchema,
            },
            {
                name: Tenant.name,
                schema: TenantSchema,
            },
            {
                name: InterviewEvaluation.name,
                schema: InterviewEvaluationSchema,
            },
            {
                name: InterviewRecording.name,
                schema: InterviewRecordingSchema,
            },
            {
                name: InterviewTranscript.name,
                schema: InterviewTranscriptSchema,
            },
        ]),
        RmqModule.register({
            name: RMQ_CONSTANTS.BOT.name,
        }),
        RmqModule.register({
            name: RMQ_CONSTANTS.AI.name,
        }),
        GoogleCalendarModule,
        InterviewerModule,
        EmailModule,
        NotificationModule,
        ApplicantJobFeedbackModule,
        ApplicantModule,
        BillingModule,
        DbIntegrationModule,
    ],
    exports: [ApplicantInterviewerService],
})
export class ApplicantInterviewerModule {}
