import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseQueueService } from '@app/common/queue/service/base-queue.service';
import { BMQ_CONSTANTS } from '@app/common/queue-constants/constants';
import { MailJobPayload } from '../interfaces/mail-job.interface';

export interface MailQueueMap {
    'process-email': MailJobPayload;
}

@Injectable()
export class MailIngestionQueue extends BaseQueueService<MailQueueMap> {
    constructor(protected readonly configService: ConfigService) {
        super(configService, BMQ_CONSTANTS.CORE.MAIL_PROCESSING, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
        });
    }

    enqueue(payload: MailJobPayload) {
        return this.add('process-email', payload);
    }
}
