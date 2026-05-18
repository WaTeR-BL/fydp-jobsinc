import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError, throwError } from 'rxjs';

const DEFAULT_RPC_TIMEOUT = 30000; // 30 seconds

export class RpcTimeoutError extends Error {
    constructor(
        public readonly pattern: string,
        public readonly timeoutMs: number,
    ) {
        super(`RPC call to '${pattern}' timed out after ${timeoutMs}ms`);
        this.name = 'RpcTimeoutError';
    }
}

export async function sendWithTimeout<T>(
    client: ClientProxy,
    pattern: string,
    data: any,
    timeoutMs: number = DEFAULT_RPC_TIMEOUT,
): Promise<T> {
    return lastValueFrom(
        client.send<T>(pattern, data).pipe(
            timeout(timeoutMs),
            catchError((error) => {
                if (error.name === 'TimeoutError') {
                    return throwError(
                        () => new RpcTimeoutError(pattern, timeoutMs),
                    );
                }
                return throwError(() => error);
            }),
        ),
    );
}

export async function emitWithTimeout(
    client: ClientProxy,
    pattern: string,
    data: any,
    timeoutMs: number = 5000,
): Promise<void> {
    return lastValueFrom(
        client.emit(pattern, data).pipe(
            timeout(timeoutMs),
            catchError((error) => {
                if (error.name === 'TimeoutError') {
                    return throwError(
                        () => new RpcTimeoutError(pattern, timeoutMs),
                    );
                }
                return throwError(() => error);
            }),
        ),
    );
}
