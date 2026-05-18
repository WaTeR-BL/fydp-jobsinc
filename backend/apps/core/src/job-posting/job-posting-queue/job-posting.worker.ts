import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobMap } from '@app/common/queue-constants/job.constants';
import { BaseWorkerService } from '@app/common/queue/service/base-worker.service';
import { JobPostingService } from '../job-posting.service';
import { JobPostData } from '../../job/interface/job.interface';

@Injectable()
export class JobPostingWorker extends BaseWorkerService<
    JobMap['linkedin-post-job']
> {
    protected queueName = 'job-posting-queue';

    constructor(private readonly jobPostingService: JobPostingService) {
        super();
    }

    async process(job: Job<JobMap['linkedin-post-job']>) {
        const rec: JobPostData = {
            text: job.data.text,
            tenantId: job.data.tenantId,
            media: job.data.media,
            targetUrns: job.data.targetUrns,
            visibility: job.data.visibility,
        };

        await this.jobPostingService.postDraftedJob(
            job.data.jobId,
            rec,
            job.data.timezone,
        );
    }
}
