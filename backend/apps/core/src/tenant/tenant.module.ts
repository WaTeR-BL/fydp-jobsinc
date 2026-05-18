import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema, RmqModule } from '@app/common';
import { MediaManagerModule } from '@app/common/media-manager/media-manager.module';
import { RMQ_CONSTANTS } from '@app/common/queue-constants/constants';
import { RedisModule } from '@app/common/redis/redis.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Tenant.name, schema: TenantSchema },
        ]),
        MediaManagerModule,
        RmqModule.register({
            name: RMQ_CONSTANTS.AI.name,
        }),
        RedisModule,
        SubscriptionModule,
    ],
    providers: [TenantService],
    controllers: [TenantController],
    exports: [MongooseModule, TenantService],
})
export class TenantModule {}
