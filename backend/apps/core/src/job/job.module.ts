import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { JobService } from './job.service';
import { MediaManagerModule } from '@app/common/media-manager/media-manager.module';
import {
    JobSchema,
    Job,
    RmqModule,
    RMQ_CONSTANTS,
    Tenant,
    TenantSchema,
} from '@app/common';
import {
    MailboxConfig,
    MailboxConfigSchema,
} from '@app/common/schemas/mailbox-config.schema';
import { MailEncryptionService } from '../mail-ingestion/services/mail-encryption.service';
import { ConfigModule } from '@nestjs/config';
import { JobSchedulerService } from '../scheduler/job.scheduler';
import { JobPostingQueue } from '../job-posting/job-posting-queue/job-posting.queue';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            { name: Job.name, schema: JobSchema },
            { name: Tenant.name, schema: TenantSchema },
            { name: MailboxConfig.name, schema: MailboxConfigSchema },
        ]),
        MediaManagerModule,
        RmqModule.register({
            name: RMQ_CONSTANTS.AI.name,
        }),
    ],
    controllers: [JobController],
    providers: [
        JobService,
        JobSchedulerService,
        JobPostingQueue,
        MailEncryptionService,
    ],
    exports: [JobService],
})
export class JobModule {}
