import { Module } from '@nestjs/common';
import { SubscriptionHistoryService } from './subscription-history.service';
import { SubscriptionHistoryController } from './subscription-history.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
    SubscriptionTransactionHistory,
    SubscriptionTransactionSchema,
} from '@app/common';

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: SubscriptionTransactionHistory.name,
                schema: SubscriptionTransactionSchema,
            },
        ]),
    ],
    providers: [SubscriptionHistoryService],
    exports: [SubscriptionHistoryService, MongooseModule],
    controllers: [SubscriptionHistoryController],
})
export class SubscriptionHistoryModule {}
