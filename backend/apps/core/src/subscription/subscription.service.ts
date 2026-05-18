import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { CreateTenantSubscriptionDto } from './dto/subscription.dto';
import { SubscriptionHistoryService } from '../subscription-history/subscription-history.service';
import { CreateSubscriptionHistoryDto } from '../subscription-history/dto/subscription-history.dto';
import { SubscriptionStatus } from '@app/common/enums/app.enums';
import { Subscription } from '@app/common';

@Injectable()
export class SubscriptionService {
    constructor(
        @InjectModel(Subscription.name)
        private readonly SubscriptionModel: Model<Subscription>,
        private readonly subscriptionHistoryService: SubscriptionHistoryService,
    ) {}

    async createTenantSubscription(
        dto: CreateTenantSubscriptionDto,
        session?: ClientSession,
    ): Promise<[string, boolean]> {
        try {
            //payment module function implement here to verify payment
            //after which tenantSubscription will be created
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setUTCMonth(endDate.getUTCMonth() + 1);
            endDate.setUTCDate(endDate.getUTCDate() + 1);
            const tenantSubscription = new this.SubscriptionModel({
                tenantId: dto.tenantId,
                planId: dto.planId,
                startDate: startDate,
                endDate: endDate,
                autoPayment: dto.autoPayment,
                // marked if payment is verified
                lastBilledAt: startDate,
                status: SubscriptionStatus.ACTIVE,
            });
            await tenantSubscription.save({ session });

            const hist = new CreateSubscriptionHistoryDto({
                subscriptionId: tenantSubscription.id,
                amount: 100,
                paymentIntentId: 'pi_456',
                status: 1,
            });

            const [msg, ok] =
                await this.subscriptionHistoryService.createSubscriptionHistory(
                    hist,
                    session,
                );
            if (!ok) return [msg, false] as [string, boolean];

            return ['Success', true] as [string, boolean];
        } catch (error) {
            return [error.message, false] as [string, boolean];
        }
    }
}
