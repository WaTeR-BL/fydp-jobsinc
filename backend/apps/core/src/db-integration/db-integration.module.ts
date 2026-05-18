import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import {
    IntegrationConfig,
    IntegrationConfigSchema,
} from '@app/common/schemas/integration-config.schema';
import {
    IntegrationExecution,
    IntegrationExecutionSchema,
} from '@app/common/schemas/integration-execution.schema';
import {
    IntegrationRefCache,
    IntegrationRefCacheSchema,
} from '@app/common/schemas/integration-ref-cache.schema';
import {
    Applicant,
    ApplicantSchema,
} from '@app/common/schemas/applicant.schema';
import {
    ApplicantJobFeedback,
    ApplicantJobFeedbackSchema,
} from '@app/common/schemas/applicant-job-feedback.schema';
import { Job, JobSchema } from '@app/common/schemas/job.schema';
import { DbIntegrationController } from './db-integration.controller';
import { IntegrationConfigService } from './services/integration-config.service';
import { IntegrationSyncService } from './services/integration-sync.service';
import { CredentialEncryptionService } from './services/credential-encryption.service';
import { ReferenceDataService } from './services/reference-data.service';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            {
                name: IntegrationConfig.name,
                schema: IntegrationConfigSchema,
            },
            {
                name: IntegrationExecution.name,
                schema: IntegrationExecutionSchema,
            },
            {
                name: IntegrationRefCache.name,
                schema: IntegrationRefCacheSchema,
            },
            {
                name: Applicant.name,
                schema: ApplicantSchema,
            },
            {
                name: ApplicantJobFeedback.name,
                schema: ApplicantJobFeedbackSchema,
            },
            {
                name: Job.name,
                schema: JobSchema,
            },
        ]),
    ],
    controllers: [DbIntegrationController],
    providers: [
        CredentialEncryptionService,
        IntegrationConfigService,
        IntegrationSyncService,
        ReferenceDataService,
    ],
    exports: [IntegrationSyncService],
})
export class DbIntegrationModule {}
