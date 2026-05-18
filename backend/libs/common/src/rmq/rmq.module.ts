import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RmqService, buildQueueOptions } from './rmq.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

interface RmqModuleOptions {
    name: string;
}

@Module({
    providers: [RmqService],
    exports: [RmqService],
})
export class RmqModule {
    static register({ name }: RmqModuleOptions): DynamicModule {
        return {
            module: RmqModule,
            imports: [
                ClientsModule.registerAsync([
                    {
                        name,
                        imports: [ConfigModule],
                        inject: [ConfigService],
                        useFactory: (configService: ConfigService) => ({
                            transport: Transport.RMQ,
                            options: {
                                urls: [
                                    configService.get<string>('rabbitmq.uri'),
                                ],
                                queue: name,
                                queueOptions: buildQueueOptions(name),
                            },
                        }),
                    },
                ]),
            ],
            exports: [ClientsModule],
        };
    }
}
