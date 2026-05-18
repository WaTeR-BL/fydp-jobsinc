import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import appConfig from '@app/common/config/app.config';
import { APP_GUARD } from '@nestjs/core';
import { AtGuard } from './common/guards/at.guard';
import { TenantModule } from './tenant/tenant.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AccountProvisioningModule } from './account-provisioning/account-provisioning.module';
import { SubscriptionHistoryModule } from './subscription-history/subscription-history.module';
import { PlanModule } from './plan/plan.module';
import { DomainModule } from './domain/domain.module';
import { GoogleCalendarModule } from './google-calender/google-calendar.module';
import { JobModule } from './job/job.module';
import { MediaManagerModule } from '@app/common/media-manager/media-manager.module';
import { ApplicantJobFeedbackModule } from './applicant-job-feedback/applicant-job-feedback.module';
import { RmqModule } from '@app/common';
import { ApplicantModule } from './applicant/applicant.module';
import { AppHandler } from './app.handler';
import { AppService } from './app.service';
import { RMQ_CONSTANTS } from '@app/common/queue-constants/constants';
import { InterviewerModule } from './interviewer/interviewer.module';
import { ApplicantInterviewerModule } from './applicant-interviewer/applicant-interviewer.module';
import { JobPostingModule } from './job-posting/job-posting.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@app/common/redis/redis.module';
import { AgendaModule } from './agenda/agenda.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { InterviewRecordingModule } from './interview-recording/interview-recording.module';
import {
    ApplicantInterview,
    ApplicantInterviewSchema,
} from '@app/common/schemas/applicant-interview.schema';
import {
    InterviewTranscript,
    InterviewTranscriptSchema,
} from '@app/common/schemas/interview-transcript.schema';
import {
    InterviewEvaluation,
    InterviewEvaluationSchema,
} from '@app/common/schemas/interview-evaluation.schema';
import { CredentialManagerModule } from './credential-manager/credential-manager.module';
import { QueueModule } from '@app/common/queue/queue.module';
import { UrlVerificationModule } from './url-verification/url-verification.module';
import { EmailModule } from './email/email.module';
import { BillingModule } from './billing/billing.module';
import { DbIntegrationModule } from './db-integration/db-integration.module';
import { MailIngestionModule } from './mail-ingestion/mail-ingestion.module';
import { AdminModule } from './admin/admin.module';
import { SeedModule } from './seed/seed.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: join(process.cwd(), '.env'),
            load: [appConfig],
            isGlobal: true,
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('mongo.uri') || '',
                autoCreate: true,
            }),
            inject: [ConfigService],
        }),
        MongooseModule.forFeature([
            {
                name: ApplicantInterview.name,
                schema: ApplicantInterviewSchema,
            },
            {
                name: InterviewTranscript.name,
                schema: InterviewTranscriptSchema,
            },
            {
                name: InterviewEvaluation.name,
                schema: InterviewEvaluationSchema,
            },
        ]),
        AgendaModule,
        ScheduleModule.forRoot(),
        UserModule,
        AuthModule,
        TenantModule,
        RedisModule,
        SubscriptionModule,
        AccountProvisioningModule,
        SubscriptionHistoryModule,
        PlanModule,
        DomainModule,
        CredentialManagerModule,
        GoogleCalendarModule,
        DashboardModule,
        JobModule,
        MediaManagerModule,
        ApplicantJobFeedbackModule,
        QueueModule,
        UrlVerificationModule,
        EmailModule,
        RmqModule.register({
            name: RMQ_CONSTANTS.AI.name,
        }),
        RmqModule.register({
            name: RMQ_CONSTANTS.BOT.name,
        }),
        ApplicantModule,
        InterviewerModule,
        ApplicantInterviewerModule,
        InterviewRecordingModule,
        JobPostingModule,
        BillingModule,
        DbIntegrationModule,
        MailIngestionModule,
        AdminModule,
        SeedModule,
    ],
    controllers: [AppHandler],
    exports: [AppService],
    providers: [AppService, { provide: APP_GUARD, useClass: AtGuard }],
})
export class AppModule {}
