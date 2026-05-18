import { Job } from 'bullmq';
import { BaseWorkerService } from './base-worker.service';

export interface FallbackConfig<T> {
    shouldFallback: (error: any, data: T) => boolean;

    getFallbackData: (data: T) => T;

    maxFallbackAttempts?: number;
}

export abstract class FallbackWorkerService<T> extends BaseWorkerService<T> {
    protected abstract fallbackConfig?: FallbackConfig<T>;

    /**
     * Process method that handles fallback logic.
     * Subclasses should NOT override this - implement processWithData instead.
     */
    async process(job: Job<T>): Promise<any> {
        let attempts = 0;
        const maxAttempts = this.fallbackConfig?.maxFallbackAttempts ?? 1;
        let currentData = job.data;

        while (attempts <= maxAttempts) {
            try {
                return await this.processWithData(currentData, job);
            } catch (error) {
                const isLastAttempt = attempts >= maxAttempts;
                const shouldTryFallback =
                    this.fallbackConfig &&
                    !isLastAttempt &&
                    this.fallbackConfig.shouldFallback(error, currentData);

                if (shouldTryFallback) {
                    this.logger.warn(
                        `Fallback triggered for job ${job.id}, attempt ${attempts + 1}/${maxAttempts}`,
                    );
                    currentData =
                        this.fallbackConfig!.getFallbackData(currentData);
                    attempts++;
                } else {
                    throw error;
                }
            }
        }

        throw new Error(
            `Unexpected: exceeded max fallback attempts for job ${job.id}`,
        );
    }

    /**
     * Process the job with the given data.
     * Subclasses must implement this method instead of process().
     *
     * @param data - The job data (may be original or transformed fallback data)
     * @param job - The BullMQ job instance for accessing metadata
     * @returns Promise with the processing result
     */
    protected abstract processWithData(data: T, job: Job<T>): Promise<any>;
}
