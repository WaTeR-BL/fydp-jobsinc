import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import {
    MailboxConfig,
    MailboxConfigSchema,
} from '@app/common/schemas/mailbox-config.schema';
import {
    TenantEmailTemplate,
    TenantEmailTemplateSchema,
} from '@app/common/schemas/tenant-email-template.schema';
import { Job, JobSchema } from '@app/common/schemas/job.schema';
import {
    ApplicantJobFeedback,
    ApplicantJobFeedbackSchema,
} from '@app/common/schemas/applicant-job-feedback.schema';
import {
    Applicant,
    ApplicantSchema,
} from '@app/common/schemas/applicant.schema';
import { MediaManagerModule } from '@app/common/media-manager/media-manager.module';
import { RmqModule, RMQ_CONSTANTS, Tenant, TenantSchema } from '@app/common';
import { BillingModule } from '../billing/billing.module';
import { MailEncryptionService } from './services/mail-encryption.service';
import { MailboxConfigService } from './services/mailbox-config.service';
import { TenantEmailTemplateService } from './services/tenant-email-template.service';
import { MailIngestionScheduler } from './services/mail-ingestion.scheduler';
import { MailWorkerService } from './services/mail-worker.service';
import { MailIngestionQueue } from './queue/mail-ingestion.queue';
import { MailboxConfigController } from './controllers/mailbox-config.controller';
import { TenantEmailTemplateController } from './controllers/tenant-email-template.controller';
import { JobModule } from '../job/job.module';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            { name: MailboxConfig.name, schema: MailboxConfigSchema },
            { name: Tenant.name, schema: TenantSchema },
            {
                name: TenantEmailTemplate.name,
                schema: TenantEmailTemplateSchema,
            },
            { name: Job.name, schema: JobSchema },
            {
                name: ApplicantJobFeedback.name,
                schema: ApplicantJobFeedbackSchema,
            },
            { name: Applicant.name, schema: ApplicantSchema },
        ]),
        MediaManagerModule,
        JobModule,
        BillingModule,
        RmqModule.register({ name: RMQ_CONSTANTS.AI.name }),
    ],
    controllers: [MailboxConfigController, TenantEmailTemplateController],
    providers: [
        MailEncryptionService,
        MailboxConfigService,
        TenantEmailTemplateService,
        MailIngestionScheduler,
        MailWorkerService,
        MailIngestionQueue,
    ],
    exports: [TenantEmailTemplateService],
})
export class MailIngestionModule {}
