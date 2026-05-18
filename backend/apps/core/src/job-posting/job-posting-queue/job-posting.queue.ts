import { BaseQueueService } from '@app/common/queue/service/base-queue.service';
import { JobMap } from '@app/common/queue-constants/job.constants';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JobPostingQueue extends BaseQueueService<JobMap> {
    constructor(protected readonly configService: ConfigService) {
        super(configService, 'job-posting-queue');
    }

    postJob(data: JobMap['linkedin-post-job']) {
        return this.add('linkedin-post-job', data);
    }
}
