import { Queue, QueueEvents, JobsOptions } from 'bullmq';
import { JobMap } from '@app/common/queue-constants/job.constants';
import { ConfigService } from '@nestjs/config';
import { OnModuleDestroy, Logger } from '@nestjs/common';

export interface QueueServiceOptions {
    defaultTimeout?: number;
}

export abstract class BaseQueueService<JM extends Record<string, any> = JobMap>
    implements OnModuleDestroy
{
    protected readonly logger = new Logger(this.constructor.name);
    protected readonly queue: Queue<any, any, string>;
    private queueEvents: QueueEvents | null = null;
    private readonly defaultTimeout: number;

    protected constructor(
        protected readonly configService: ConfigService,
        queueName: string,
        defaultJobOptions?: JobsOptions,
        options?: QueueServiceOptions,
    ) {
        this.queue = new Queue(queueName, {
            connection: {
                host: this.configService.get<string>('redis.host'),
                port: this.configService.get<number>('redis.port'),
            },
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: { age: 3600, count: 1000 },
                removeOnFail: { age: 86400, count: 1000 }, // Keep failed jobs for 24h or last 1000
                ...defaultJobOptions,
            },
        });
        this.defaultTimeout = options?.defaultTimeout ?? 30000;
    }

    /**
     * Add a job to the queue (fire-and-forget).
     */
    add<K extends keyof JM>(name: K, data: JM[K], opts?: JobsOptions) {
        return this.queue.add(name as string, data as any, opts);
    }

    /**
     * Add multiple jobs to the queue at once.
     */
    addBulk<K extends keyof JM>(
        jobs: Array<{ name: K; data: JM[K]; opts?: JobsOptions }>,
    ) {
        const bulkJobs = jobs.map((job) => ({
            name: job.name as string,
            data: job.data as any,
            opts: job.opts,
        }));
        return this.queue.addBulk(bulkJobs);
    }

    /**
     * Add a job and wait for the result with timeout.
     * QueueEvents is created lazily on first call and reused.
     */
    async addAndWait<K extends keyof JM, R = any>(
        name: K,
        data: JM[K],
        opts?: JobsOptions & { timeout?: number },
    ): Promise<R> {
        const job = await this.add(name, data, opts);
        const timeout = opts?.timeout ?? this.defaultTimeout;

        try {
            const result = await job.waitUntilFinished(
                this.getQueueEvents(),
                timeout,
            );
            return result as R;
        } catch (error: any) {
            if (error.message?.includes('timed out')) {
                this.logger.error(
                    `Job ${job.id} (${String(name)}) timed out after ${timeout}ms`,
                );
                throw new Error(
                    `Job ${String(name)} timed out after ${timeout}ms`,
                );
            }
            throw error;
        }
    }

    /**
     * Get or create shared QueueEvents instance (lazy initialization).
     * Only created when addAndWait is used.
     */
    private getQueueEvents(): QueueEvents {
        if (!this.queueEvents) {
            this.queueEvents = new QueueEvents(this.queue.name, {
                connection: {
                    host: this.configService.get<string>('redis.host'),
                    port: this.configService.get<number>('redis.port'),
                },
            });
            this.logger.log(
                `QueueEvents initialized for queue: ${this.queue.name}`,
            );
        }
        return this.queueEvents;
    }

    /**
     * Close the queue connection.
     */
    async close() {
        await this.queue.close();
    }

    /**
     * Cleanup on module destroy.
     */
    async onModuleDestroy() {
        if (this.queueEvents) {
            this.logger.log(
                `Closing QueueEvents for queue: ${this.queue.name}`,
            );
            await this.queueEvents.close();
            this.queueEvents = null;
        }
        await this.close();
    }
}
