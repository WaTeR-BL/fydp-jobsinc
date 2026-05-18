import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Tenant, Subscription } from '@app/common';
import { SubscriptionStatus } from '@app/common/enums/app.enums';

@Injectable()
export class PaymentService {
    constructor(
        @Inject('STRIPE') private readonly stripe: Stripe,
        @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
        @InjectModel(Subscription.name)
        private readonly subscriptionModel: Model<Subscription>,
        private readonly config: ConfigService,
    ) {}

    async createStripeCustomer(
        tenantId: string,
        email: string,
        name: string,
        session?: ClientSession,
    ): Promise<[string, boolean, string?]> {
        try {
            const existing = await this.tenantModel
                .findById(tenantId)
                .select('stripeCustomerId')
                .lean()
                .session(session);

            if (existing?.stripeCustomerId) {
                return [
                    'Customer already exists',
                    true,
                    existing.stripeCustomerId,
                ];
            }

            const customer = await this.stripe.customers.create(
                { email, name, metadata: { tenantId } },
                { idempotencyKey: `${tenantId}:create-customer` },
            );

            await this.tenantModel.findByIdAndUpdate(
                tenantId,
                { stripeCustomerId: customer.id },
                { session }
            );

            return ['Success', true, customer.id];
        } catch (error) {
            return [error.message, false];
        }
    }

    async createCheckoutSession(
        tenantId: string,
        priceId: string,
        successUrl: string,
        cancelUrl: string,
        addonPriceIds?: string[],
    ): Promise<[string, boolean, { url: string }?]> {
        try {
            const tenant = await this.tenantModel
                .findById(tenantId)
                .select('stripeCustomerId')
                .lean();

            if (!tenant?.stripeCustomerId) {
                return ['Stripe customer not found for this tenant', false];
            }

            const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
                { price: priceId, quantity: 1 },
                ...(addonPriceIds ?? []).map((id) => ({
                    price: id,
                    quantity: 1,
                })),
            ];

            const session = await this.stripe.checkout.sessions.create({
                customer: tenant.stripeCustomerId,
                mode: 'subscription',
                line_items: lineItems,
                success_url: successUrl,
                cancel_url: cancelUrl,
                allow_promotion_codes: true,
                metadata: { tenantId },
            });

            return ['Success', true, { url: session.url }];
        } catch (error) {
            return [error.message, false];
        }
    }

    async createPortalSession(
        tenantId: string,
        returnUrl: string,
    ): Promise<[string, boolean, { url: string }?]> {
        try {
            const tenant = await this.tenantModel
                .findById(tenantId)
                .select('stripeCustomerId')
                .lean();

            if (!tenant?.stripeCustomerId) {
                return ['Stripe customer not found for this tenant', false];
            }

            const session = await this.stripe.billingPortal.sessions.create({
                customer: tenant.stripeCustomerId,
                return_url: returnUrl,
            });

            return ['Success', true, { url: session.url }];
        } catch (error) {
            return [error.message, false];
        }
    }

    async cancelAtPeriodEnd(tenantId: string): Promise<[string, boolean]> {
        try {
            const sub = await this.subscriptionModel.findOne({
                tenantId,
                status: SubscriptionStatus.ACTIVE,
            });

            if (!sub?.stripeSubscriptionId) {
                return ['No active subscription found', false];
            }

            await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
                cancel_at_period_end: true,
            });

            sub.cancelAtPeriodEnd = true;
            await sub.save();

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async changePlan(
        tenantId: string,
        newPriceId: string,
        isUpgrade: boolean,
    ): Promise<[string, boolean]> {
        try {
            const sub = await this.subscriptionModel.findOne({
                tenantId,
                status: SubscriptionStatus.ACTIVE,
            });

            if (!sub?.stripeSubscriptionId) {
                return ['No active subscription found', false];
            }

            const stripeSub = await this.stripe.subscriptions.retrieve(
                sub.stripeSubscriptionId,
            );

            // Find the plan item explicitly — exclude the WhatsApp addon if present
            const addonPriceId = this.config.get<string>(
                'stripe.whatsappAddonPriceId',
            );
            const planItem = stripeSub.items.data.find(
                (i) => !addonPriceId || i.price.id !== addonPriceId,
            );
            if (!planItem?.id) {
                return ['No subscription plan item found', false];
            }

            await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
                items: [{ id: planItem.id, price: newPriceId }],
                proration_behavior: 'create_prorations',
            });

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async addWhatsappManagedAddon(
        tenantId: string,
    ): Promise<[string, boolean]> {
        try {
            const sub = await this.subscriptionModel.findOne({
                tenantId,
                status: SubscriptionStatus.ACTIVE,
            });

            if (!sub?.stripeSubscriptionId) {
                return ['No active subscription found', false];
            }

            if (sub.whatsappManagedActive) {
                return ['Managed WhatsApp add-on is already active', false];
            }

            const addonPriceId = this.config.get<string>(
                'stripe.whatsappAddonPriceId',
            );

            const updatedSub = await this.stripe.subscriptions.update(
                sub.stripeSubscriptionId,
                {
                    items: [{ price: addonPriceId }],
                    proration_behavior: 'create_prorations',
                },
            );

            const addonItem = updatedSub.items.data.find(
                (item) => item.price.id === addonPriceId,
            );

            await this.subscriptionModel.findByIdAndUpdate(sub._id, {
                whatsappManagedActive: true,
                stripeWhatsappItemId: addonItem?.id ?? null,
            });

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async removeWhatsappManagedAddon(
        tenantId: string,
    ): Promise<[string, boolean]> {
        try {
            const sub = await this.subscriptionModel.findOne({
                tenantId,
                status: SubscriptionStatus.ACTIVE,
            });

            if (!sub?.stripeSubscriptionId) {
                return ['No active subscription found', false];
            }

            if (!sub.whatsappManagedActive) {
                return ['Managed WhatsApp add-on is not active', false];
            }

            if (!sub.stripeWhatsappItemId) {
                return ['WhatsApp subscription item ID not found', false];
            }

            await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
                items: [{ id: sub.stripeWhatsappItemId, deleted: true }],
                proration_behavior: 'create_prorations',
            });

            await this.subscriptionModel.findByIdAndUpdate(sub._id, {
                whatsappManagedActive: false,
                stripeWhatsappItemId: null,
                whatsappManagedMessagesUsed: 0,
            });

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }
}
