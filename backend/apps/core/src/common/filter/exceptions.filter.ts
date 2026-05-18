import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        let message: string;
        let errors: any = null;

        if (typeof exceptionResponse === 'string') {
            message = exceptionResponse;
        } else {
            message = (exceptionResponse as any).message || 'Unexpected error';
            errors = (exceptionResponse as any).errors || null;
        }

        console.error('=== EXCEPTION CAUGHT ===');
        console.error('Timestamp:', new Date().toISOString());
        console.error('Path:', request.url);
        console.error('Method:', request.method);
        console.error('Status Code:', status);
        console.error('Message:', message);
        console.error('Errors:', errors);
        console.error('Request Body:', JSON.stringify(request.body, null, 2));
        console.error('Request Query:', JSON.stringify(request.query, null, 2));
        console.error(
            'Request Params:',
            JSON.stringify(request.params, null, 2),
        );

        if (exception instanceof Error) {
            console.error('Error Name:', exception.name);
            console.error('Error Message:', exception.message);
            console.error('Stack Trace:', exception.stack);
        } else {
            console.error('Raw Exception:', exception);
        }
        console.error('========================\n');

        response.status(status).json({
            statusCode: status,
            message: Array.isArray(message) ? message : message,
            ...(errors && { errors }),
            data: '',
        });
    }
}
