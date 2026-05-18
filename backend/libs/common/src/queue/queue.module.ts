import { JobPostingWorker } from '../../../../apps/core/src/job-posting/job-posting-queue/job-posting.worker';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JobPostingModule } from '../../../../apps/core/src/job-posting/job-posting.module';
import { JobPostingQueue } from '../../../../apps/core/src/job-posting/job-posting-queue/job-posting.queue';

@Module({
    imports: [ConfigModule, JobPostingModule],
    providers: [JobPostingQueue, JobPostingWorker],
    exports: [JobPostingQueue],
})
export class QueueModule {}
