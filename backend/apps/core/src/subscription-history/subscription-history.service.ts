import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { CreateSubscriptionHistoryDto } from './dto/subscription-history.dto';
import { SubscriptionTransactionHistory } from '@app/common';

@Injectable()
export class SubscriptionHistoryService {
    constructor(
        @InjectModel(SubscriptionTransactionHistory.name)
        private readonly subscriptionHistoryModel: Model<SubscriptionTransactionHistory>,
    ) {}

    async createSubscriptionHistory(
        dto: CreateSubscriptionHistoryDto,
        session?: ClientSession,
    ) {
        try {
            const history = new this.subscriptionHistoryModel({
                subscriptionId: dto.subscriptionId,
                status: dto.status,
                paymentIntentId: dto.paymentIntentId,
                amount: dto.amount,
            });
            await history.save({ session });
            return ['Success', true] as [string, boolean];
        } catch (error) {
            return [error.message, false] as [string, boolean];
        }
    }
}
