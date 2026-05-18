import { Injectable } from '@nestjs/common';
import { RmqOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

export interface RmqQueueOptions {
    prefetchCount?: number;
    messageTtl?: number;
    maxRetries?: number;
    enableDlx?: boolean;
}

const DEFAULT_PREFETCH = 1;
const DEFAULT_MESSAGE_TTL = 86400000; // 24 hours

export function buildQueueOptions(
    queue: string,
    options?: RmqQueueOptions,
): Record<string, any> {
    const messageTtl = options?.messageTtl ?? DEFAULT_MESSAGE_TTL;
    const enableDlx = options?.enableDlx ?? true;

    const queueOptions: Record<string, any> = {
        durable: true,
        arguments: {
            'x-message-ttl': messageTtl,
        },
    };

    if (enableDlx) {
        queueOptions.arguments['x-dead-letter-exchange'] = '';
        queueOptions.arguments['x-dead-letter-routing-key'] = `${queue}-dlq`;
    }

    return queueOptions;
}

@Injectable()
export class RmqService {
    constructor(private readonly configService: ConfigService) {}

    getOptions(
        queue: string,
        noAck = true,
        options?: RmqQueueOptions,
    ): RmqOptions {
        const prefetchCount = options?.prefetchCount ?? DEFAULT_PREFETCH;

        return {
            transport: Transport.RMQ,
            options: {
                urls: [this.configService.get<string>('rabbitmq.uri')],
                queue,
                noAck,
                prefetchCount,
                queueOptions: buildQueueOptions(queue, options),
            },
        };
    }

    getClientOptions(
        queue: string,
        options?: RmqQueueOptions,
    ): {
        transport: Transport;
        options: Record<string, any>;
    } {
        return {
            transport: Transport.RMQ,
            options: {
                urls: [this.configService.get<string>('rabbitmq.uri')],
                queue,
                queueOptions: buildQueueOptions(queue, options),
            },
        };
    }

    getDlqOptions(queue: string): RmqOptions {
        return {
            transport: Transport.RMQ,
            options: {
                urls: [this.configService.get<string>('rabbitmq.uri')],
                queue: `${queue}-dlq`,
                noAck: false,
                queueOptions: {
                    durable: true,
                },
            },
        };
    }
}
