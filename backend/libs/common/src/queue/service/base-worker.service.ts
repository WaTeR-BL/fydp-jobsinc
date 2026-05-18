import { Worker, Job, WorkerOptions, Queue } from 'bullmq';
import { Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WorkerLimiter {
    max: number;
    duration: number;
}

/**
 * Dead Letter Queue configuration.
 * When a job exhausts all retries, it can be moved to a DLQ for later inspection or reprocessing.
 */
export interface DeadLetterQueueConfig {
    /** Name of the dead letter queue */
    queueName: string;
    /** Optional: transform job data before moving to DLQ */
    transformData?: (job: Job, error: Error) => Record<string, any>;
}

export abstract class BaseWorkerService<T>
    implements OnModuleInit, OnModuleDestroy
{
    protected readonly logger = new Logger(this.constructor.name);
    protected worker!: Worker<T, any, string>;
    private dlq: Queue | null = null;
    private isRedisConnected = true;

    protected abstract queueName: string;
    protected concurrency = 5;

    /**
     * Optional rate limiter configuration.
     * @example protected limiter = { max: 100, duration: 60000 }; // 100 jobs per minute
     */
    protected limiter?: WorkerLimiter;

    /**
     * Optional Dead Letter Queue configuration.
     * When set, jobs that exhaust all retries will be moved to this queue.
     */
    protected deadLetterQueue?: DeadLetterQueueConfig;

    abstract process(job: Job<T>): Promise<any>;

    @Inject(ConfigService)
    protected readonly configService!: ConfigService;

    protected getWorkerOptions(): Partial<WorkerOptions> {
        return {};
    }

    onModuleInit() {
        const baseOptions: WorkerOptions = {
            connection: {
                host: this.configService.get<string>('redis.host'),
                port: this.configService.get<number>('redis.port'),
            },
            concurrency: this.concurrency,
        };

        if (this.limiter) {
            baseOptions.limiter = this.limiter;
            this.logger.log(
                `Rate limiter configured: ${this.limiter.max} jobs per ${this.limiter.duration}ms`,
            );
        }

        const workerOptions = { ...baseOptions, ...this.getWorkerOptions() };

        this.worker = new Worker<T, any, string>(
            this.queueName,
            async (job: Job<T>) => {
                this.logger.log(`Processing job ${job.name} (${job.id})`);

                try {
                    const result = await this.process(job);
                    this.logger.log(`Job ${job.name} (${job.id}) completed`);
                    return result;
                } catch (err) {
                    this.logger.error(
                        `Job ${job.name} (${job.id}) failed`,
                        (err as Error).stack,
                    );
                    throw err;
                }
            },
            workerOptions,
        );

        // Initialize DLQ if configured
        if (this.deadLetterQueue) {
            this.initializeDeadLetterQueue();
        }

        this.bindEvents();
        this.bindConnectionEvents();

        this.logger.log(
            `Worker initialized for queue: ${this.queueName} (concurrency: ${this.concurrency})`,
        );
    }

    /**
     * Initialize Dead Letter Queue
     */
    private initializeDeadLetterQueue(): void {
        if (!this.deadLetterQueue) return;

        this.dlq = new Queue(this.deadLetterQueue.queueName, {
            connection: {
                host: this.configService.get<string>('redis.host'),
                port: this.configService.get<number>('redis.port'),
            },
        });

        this.logger.log(
            `Dead Letter Queue initialized: ${this.deadLetterQueue.queueName}`,
        );
    }

    /**
     * Move a failed job to the Dead Letter Queue
     */
    private async moveToDeadLetterQueue(
        job: Job | undefined,
        error: Error,
    ): Promise<void> {
        if (!this.dlq || !this.deadLetterQueue || !job) return;

        const dlqData = this.deadLetterQueue.transformData
            ? this.deadLetterQueue.transformData(job, error)
            : {
                  originalJobId: job.id,
                  originalJobName: job.name,
                  originalQueue: this.queueName,
                  originalData: job.data,
                  failedAt: new Date().toISOString(),
                  error: error.message,
                  stack: error.stack,
                  attemptsMade: job.attemptsMade,
              };

        await this.dlq.add('dead-letter', dlqData, {
            removeOnComplete: false,
            removeOnFail: false,
        });

        this.logger.warn(
            `Job ${job.id} moved to DLQ: ${this.deadLetterQueue.queueName}`,
        );
    }

    protected bindEvents() {
        this.worker.on('failed', async (job, err) => {
            const isLastAttempt =
                job && job.attemptsMade >= (job.opts?.attempts || 3);

            if (isLastAttempt && this.deadLetterQueue) {
                this.logger.error(
                    `Job ${job?.id} exhausted all retries, moving to DLQ`,
                );
                await this.moveToDeadLetterQueue(job, err);
            } else {
                this.logger.error(
                    `Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts || 3})`,
                    err?.stack,
                );
            }
        });

        this.worker.on('completed', (job) => {
            this.logger.log(`Job ${job.id} completed`);
        });

        this.worker.on('stalled', (jobId) => {
            this.logger.warn(`Job ${jobId} stalled - may be reprocessed`);
        });

        this.worker.on('error', (err) => {
            this.logger.error(`Worker error: ${err.message}`, err.stack);
        });
    }

    /**
     * Bind Redis connection events for health monitoring
     */
    private bindConnectionEvents(): void {
        this.worker.client.then((client) => {
            client.on('connect', () => {
                if (!this.isRedisConnected) {
                    this.logger.log(
                        `Redis connection restored for worker: ${this.queueName}`,
                    );
                }
                this.isRedisConnected = true;
            });

            client.on('ready', () => {
                this.logger.log(`Redis ready for worker: ${this.queueName}`);
                this.isRedisConnected = true;
            });

            client.on('error', (err: Error) => {
                this.logger.error(
                    `Redis connection error for worker ${this.queueName}: ${err.message}`,
                );
            });

            client.on('close', () => {
                this.logger.warn(
                    `Redis connection closed for worker: ${this.queueName}`,
                );
                this.isRedisConnected = false;
            });

            client.on('reconnecting', () => {
                this.logger.warn(
                    `Redis reconnecting for worker: ${this.queueName}...`,
                );
            });

            client.on('end', () => {
                this.logger.warn(
                    `Redis connection ended for worker: ${this.queueName}`,
                );
                this.isRedisConnected = false;
            });
        });
    }

    /**
     * Check if Redis connection is healthy
     */
    isHealthy(): boolean {
        return this.isRedisConnected && this.worker?.isRunning();
    }

    async onModuleDestroy() {
        this.logger.log(`Shutting down worker: ${this.queueName}`);

        if (this.dlq) {
            await this.dlq.close();
            this.dlq = null;
        }

        await this.worker?.close();
    }
}
