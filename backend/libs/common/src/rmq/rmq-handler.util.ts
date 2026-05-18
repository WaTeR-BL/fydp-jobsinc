import { Logger } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';

const DEFAULT_MAX_RETRIES = 3;
const RETRY_HEADER = 'x-retry-count';

export interface RmqHandlerOptions {
    maxRetries?: number;
    logger?: Logger;
}

export interface RmqHandlerResult {
    success: boolean;
    retryCount: number;
    sentToDlq: boolean;
}

export async function handleRmqMessage<T>(
    context: RmqContext,
    handler: () => Promise<T>,
    options?: RmqHandlerOptions,
): Promise<T | null> {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    const logger = options?.logger ?? new Logger('RmqHandler');

    const retryCount = getRetryCount(originalMessage);
    const messageId = originalMessage.properties?.messageId || 'unknown';

    try {
        const result = await handler();
        channel.ack(originalMessage);
        return result;
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);

        if (retryCount >= maxRetries) {
            logger.error(
                `Message ${messageId} failed after ${retryCount} retries, sending to DLQ: ${errorMessage}`,
            );
            channel.reject(originalMessage, false);
            return null;
        }

        logger.warn(
            `Message ${messageId} failed (attempt ${retryCount + 1}/${maxRetries}), requeuing: ${errorMessage}`,
        );

        channel.nack(originalMessage, false, false);

        channel.publish(
            '',
            originalMessage.fields.routingKey,
            originalMessage.content,
            {
                ...originalMessage.properties,
                headers: {
                    ...originalMessage.properties.headers,
                    [RETRY_HEADER]: retryCount + 1,
                },
            },
        );

        return null;
    }
}

export function getRetryCount(message: any): number {
    return message?.properties?.headers?.[RETRY_HEADER] || 0;
}

export function ackMessage(context: RmqContext): void {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.ack(message);
}

export function rejectToDlq(context: RmqContext): void {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.reject(message, false);
}
