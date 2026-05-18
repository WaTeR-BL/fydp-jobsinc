import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionHistoryService } from '../subscription-history/subscription-history.service';
import { SubscriptionHistoryModule } from '../subscription-history/subscription-history.module';
import { SubscriptionSchema, Subscription } from '@app/common';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Subscription.name, schema: SubscriptionSchema },
        ]),
        SubscriptionHistoryModule,
    ],
    providers: [SubscriptionService, SubscriptionHistoryService],
    controllers: [SubscriptionController],
    exports: [MongooseModule, SubscriptionService],
})
export class SubscriptionModule {}
