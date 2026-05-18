import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription } from '@app/common';
import { SubscriptionStatus } from '@app/common/enums/app.enums';

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class BillingCronService {
    constructor(
        @InjectModel(Subscription.name)
        private readonly subscriptionModel: Model<Subscription>,
    ) {}

    @Cron('0 3 * * *')
    async cancelOverdueSubscriptions(): Promise<void> {
        const graceCutoff = new Date(Date.now() - GRACE_PERIOD_MS);

        await this.subscriptionModel.updateMany(
            {
                status: SubscriptionStatus.PAST_DUE,
                currentPeriodEnd: { $lt: graceCutoff },
            },
            { status: SubscriptionStatus.CANCELED },
        );
    }
}
