import { Job, JobsOptions } from 'bullmq';

export interface QueueConfig {
    name: string;
    connection: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };
    defaultJobOptions?: JobsOptions;
}

export interface WorkerConfig extends QueueConfig {
    concurrency?: number;
    limiter?: {
        max: number;
        duration: number;
    };
}

export interface JobProcessor<T = any> {
    process(data: T, job: Job<T>): Promise<any>;
}

export interface QueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
}
