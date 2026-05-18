import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';
import { ExceptionsFilter } from './common/filter/exceptions.filter';
import { MicroserviceOptions } from '@nestjs/microservices';
import { RmqService } from '@app/common';
import { setupSwagger } from './config/swagger.config';
import { RMQ_CONSTANTS } from '@app/common/queue-constants/constants';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
        rawBody: true,
    });

    const configService = app.get(ConfigService);
    const allowedOrigins = configService.get<string[]>('cors.origins');

    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }

            if (origin.startsWith('chrome-extension://')) {
                return callback(null, true);
            }

            if (
                allowedOrigins.some(
                    (allowed) => origin === allowed || origin.endsWith(allowed),
                )
            ) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin',
        ],
        exposedHeaders: ['Content-Range', 'X-Content-Range'],
        maxAge: 3600,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
            disableErrorMessages: false,
        }),
    );

    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new ExceptionsFilter());

    const rmqService = app.get(RmqService);

    try {
        app.connectMicroservice<MicroserviceOptions>(
            rmqService.getOptions(RMQ_CONSTANTS.CORE.name, false),
        );
        await app.startAllMicroservices();
        console.log('Microservices started successfully');
    } catch (error) {
        console.error('Failed to start microservices:', error);
    }

    setupSwagger(app);

    const port = configService.get<number>('port.core') || 3434;

    await app.listen(port);

    console.log(`Core service running on port ${port}`);

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise);
        console.error('Reason:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        console.error('Stack:', error.stack);
        setTimeout(() => process.exit(1), 1000);
    });

    process.on('SIGTERM', async () => {
        console.log('SIGTERM signal received: closing HTTP server');
        await app.close();
        console.log('HTTP server closed');
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        console.log('SIGINT signal received: closing HTTP server');
        await app.close();
        console.log('HTTP server closed');
        process.exit(0);
    });
}

bootstrap().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
