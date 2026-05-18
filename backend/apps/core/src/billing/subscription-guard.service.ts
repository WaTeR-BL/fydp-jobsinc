import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription, Plan } from '@app/common';
import { SubscriptionStatus } from '@app/common/enums/app.enums';

@Injectable()
export class SubscriptionGuardService {
    constructor(
        @InjectModel(Subscription.name)
        private readonly subscriptionModel: Model<Subscription>,
    ) {}

    async getActiveSubscription(tenantId: string) {
        return this.subscriptionModel
            .findOne({ tenantId, status: SubscriptionStatus.ACTIVE })
            .populate<{ planId: Plan[] }>('planId')
            .lean();
    }

    async canUseCvAnalysis(
        tenantId: string,
    ): Promise<{ allowed: boolean; reason?: string }> {
        const sub = await this.getActiveSubscription(tenantId);
        if (!sub) return { allowed: false, reason: 'No active subscription' };

        const plan = sub.planId[0] as unknown as Plan;

        if (sub.cvUsed < (plan.cvLimit ?? 0)) return { allowed: true };
        if ((plan.unitCvPrice ?? 0) > 0) return { allowed: true };

        return { allowed: false, reason: 'Monthly CV analysis limit reached' };
    }

    async canUseEvaluation(
        tenantId: string,
    ): Promise<{ allowed: boolean; reason?: string }> {
        const sub = await this.getActiveSubscription(tenantId);
        if (!sub) return { allowed: false, reason: 'No active subscription' };

        const plan = sub.planId[0] as unknown as Plan;

        if (sub.evalBlocksUsed < (plan.evalBlocksIncluded ?? 0))
            return { allowed: true };
        if ((plan.evalBlocksPrice ?? 0) > 0) return { allowed: true };

        return {
            allowed: false,
            reason: 'Monthly evaluation block limit reached',
        };
    }

    async recordCvUsage(tenantId: string): Promise<void> {
        await this.subscriptionModel.findOneAndUpdate(
            { tenantId, status: SubscriptionStatus.ACTIVE },
            { $inc: { cvUsed: 1 } },
        );
    }

    async recordEvalBlockUsage(tenantId: string): Promise<void> {
        await this.subscriptionModel.findOneAndUpdate(
            { tenantId, status: SubscriptionStatus.ACTIVE },
            { $inc: { evalBlocksUsed: 1 } },
        );
    }

    async canUseWhatsapp(
        tenantId: string,
    ): Promise<{ allowed: boolean; isManaged: boolean; reason?: string }> {
        const sub = await this.getActiveSubscription(tenantId);
        if (!sub)
            return {
                allowed: false,
                isManaged: false,
                reason: 'No active subscription',
            };

        const plan = sub.planId[0] as unknown as Plan;
        if (!plan.whatsappIntegration)
            return {
                allowed: false,
                isManaged: false,
                reason: 'WhatsApp integration is not included in this plan',
            };

        return { allowed: true, isManaged: Boolean(sub.whatsappManagedActive) };
    }

    async recordWhatsappMessageUsage(tenantId: string): Promise<void> {
        await this.subscriptionModel.findOneAndUpdate(
            {
                tenantId,
                status: SubscriptionStatus.ACTIVE,
                whatsappManagedActive: true,
            },
            { $inc: { whatsappManagedMessagesUsed: 1 } },
        );
    }
}
