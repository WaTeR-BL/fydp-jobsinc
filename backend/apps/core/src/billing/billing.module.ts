import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
    Tenant,
    TenantSchema,
    Subscription,
    SubscriptionSchema,
    Plan,
    PlanSchema,
    WebhookEvent,
    WebhookEventSchema,
    SubscriptionTransactionHistory,
    SubscriptionTransactionSchema,
} from '@app/common';
import { BillingController } from './billing.controller';
import { PaymentService } from './payment.service';
import { WebhookService } from './webhook.service';
import { SubscriptionGuardService } from './subscription-guard.service';
import { BillingCronService } from './billing-cron.service';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            { name: Tenant.name, schema: TenantSchema },
            { name: Subscription.name, schema: SubscriptionSchema },
            { name: Plan.name, schema: PlanSchema },
            { name: WebhookEvent.name, schema: WebhookEventSchema },
            {
                name: SubscriptionTransactionHistory.name,
                schema: SubscriptionTransactionSchema,
            },
        ]),
    ],
    controllers: [BillingController],
    providers: [
        {
            provide: 'STRIPE',
            useFactory: (config: ConfigService) =>
                new Stripe(config.get<string>('stripe.secretKey'), {
                    apiVersion: '2026-01-28.clover',
                }),
            inject: [ConfigService],
        },
        PaymentService,
        WebhookService,
        SubscriptionGuardService,
        BillingCronService,
    ],
    exports: [SubscriptionGuardService, PaymentService],
})
export class BillingModule {}
