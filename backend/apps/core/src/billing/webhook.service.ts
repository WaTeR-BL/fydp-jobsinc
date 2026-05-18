import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import {
    Subscription,
    Plan,
    WebhookEvent,
    SubscriptionTransactionHistory,
} from '@app/common';
import {
    SubscriptionStatus,
    PaymentStatus,
    WebhookEventStatus,
} from '@app/common/enums/app.enums';

const WHATSAPP_MESSAGES_INCLUDED = 1000;
const WHATSAPP_MSG_OVERAGE_PRICE = 0.01;

@Injectable()
export class WebhookService {
    constructor(
        @Inject('STRIPE') private readonly stripe: Stripe,
        @InjectModel(WebhookEvent.name)
        private readonly webhookEventModel: Model<WebhookEvent>,
        @InjectModel(Subscription.name)
        private readonly subscriptionModel: Model<Subscription>,
        @InjectModel(Plan.name)
        private readonly planModel: Model<Plan>,
        @InjectModel(SubscriptionTransactionHistory.name)
        private readonly historyModel: Model<SubscriptionTransactionHistory>,
        private readonly config: ConfigService,
    ) {}

    constructAndSave(rawBody: Buffer, sig: string): Stripe.Event {
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                rawBody,
                sig,
                this.config.get<string>('stripe.webhookSecret'),
            );
        } catch {
            throw new BadRequestException('Invalid Stripe webhook signature');
        }

        this.webhookEventModel
            .findOneAndUpdate(
                { stripeEventId: event.id },
                {
                    stripeEventId: event.id,
                    type: event.type,
                    payload: event.data.object,
                    status: WebhookEventStatus.RECEIVED,
                },
                { upsert: true, new: true },
            )
            .exec()
            .catch(() => {});

        return event;
    }

    async processEvent(event: Stripe.Event): Promise<void> {
        const handlers: Partial<
            Record<
                string,
                (data: Stripe.Event['data']['object']) => Promise<void>
            >
        > = {
            'checkout.session.completed': (d) =>
                this.handleCheckoutCompleted(d as Stripe.Checkout.Session),
            'invoice.paid': (d) => this.handleInvoicePaid(d as Stripe.Invoice),
            'invoice.payment_failed': (d) =>
                this.handleInvoicePaymentFailed(d as Stripe.Invoice),
            'invoice.created': (d) =>
                this.handleInvoiceCreated(d as Stripe.Invoice),
            'customer.subscription.deleted': (d) =>
                this.handleSubscriptionDeleted(d as Stripe.Subscription),
            'customer.subscription.updated': (d) =>
                this.handleSubscriptionUpdated(d as Stripe.Subscription),
        };

        const handler = handlers[event.type];
        if (!handler) return;

        try {
            await handler(event.data.object);
            await this.webhookEventModel.findOneAndUpdate(
                { stripeEventId: event.id },
                {
                    status: WebhookEventStatus.PROCESSED,
                    processedAt: new Date(),
                },
            );
        } catch (err) {
            await this.webhookEventModel.findOneAndUpdate(
                { stripeEventId: event.id },
                {
                    $inc: { attempts: 1 },
                    status: WebhookEventStatus.FAILED,
                    error: err.message,
                },
            );
            throw err;
        }
    }

    private extractSubscriptionId(invoice: Stripe.Invoice): string | null {
        const subscription = invoice.parent?.subscription_details?.subscription;
        if (!subscription) return null;
        return typeof subscription === 'string'
            ? subscription
            : subscription.id;
    }

    private getPeriodDates(stripeSub: Stripe.Subscription): {
        start: Date;
        end: Date;
    } {
        const item = stripeSub.items.data[0];
        return {
            start: new Date(item.current_period_start * 1000),
            end: new Date(item.current_period_end * 1000),
        };
    }

    private async handleCheckoutCompleted(
        session: Stripe.Checkout.Session,
    ): Promise<void> {
        const tenantId = session.metadata?.tenantId;
        if (!tenantId) return;

        const stripeSub = await this.stripe.subscriptions.retrieve(
            session.subscription as string,
        );

        const whatsappAddonPriceId = this.config.get<string>(
            'stripe.whatsappAddonPriceId',
        );

        // Separate plan item from addon item(s)
        const addonItem = whatsappAddonPriceId
            ? stripeSub.items.data.find(
                  (i) => i.price.id === whatsappAddonPriceId,
              )
            : undefined;
        const planItem = stripeSub.items.data.find(
            (i) => i.price.id !== whatsappAddonPriceId,
        );

        const priceId = planItem?.price?.id;
        const plan = await this.planModel.findOne({ stripePriceId: priceId });
        if (!plan) return;

        const { start, end } = this.getPeriodDates(stripeSub);

        const updateFields: Record<string, any> = {
            planId: [plan._id],
            status: SubscriptionStatus.ACTIVE,
            stripeSubscriptionId: stripeSub.id,
            currentPeriodStart: start,
            currentPeriodEnd: end,
            startDate: start,
            cvUsed: 0,
            evalBlocksUsed: 0,
            cancelAtPeriodEnd: false,
            lastBilledAt: new Date(),
        };

        if (addonItem) {
            updateFields.whatsappManagedActive = true;
            updateFields.stripeWhatsappItemId = addonItem.id;
        }

        const sub = await this.subscriptionModel.findOneAndUpdate(
            { tenantId },
            updateFields,
            { upsert: true, new: true },
        );

        await this.historyModel.create({
            subscriptionId: sub._id,
            amount: plan.price,
            paymentIntentId: session.payment_intent ?? null,
            status: PaymentStatus.SUCCESS,
        });
    }

    private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
        const subscriptionId = this.extractSubscriptionId(invoice);
        if (!subscriptionId) return;

        const stripeSub =
            await this.stripe.subscriptions.retrieve(subscriptionId);
        const { start, end } = this.getPeriodDates(stripeSub);

        await this.subscriptionModel.findOneAndUpdate(
            { stripeSubscriptionId: subscriptionId },
            {
                status: SubscriptionStatus.ACTIVE,
                cvUsed: 0,
                evalBlocksUsed: 0,
                whatsappManagedMessagesUsed: 0,
                currentPeriodStart: start,
                currentPeriodEnd: end,
                lastBilledAt: new Date(),
            },
        );
    }

    private async handleInvoicePaymentFailed(
        invoice: Stripe.Invoice,
    ): Promise<void> {
        const subscriptionId = this.extractSubscriptionId(invoice);
        if (!subscriptionId) return;

        await this.subscriptionModel.findOneAndUpdate(
            { stripeSubscriptionId: subscriptionId },
            { status: SubscriptionStatus.PAST_DUE },
        );
    }

    private async handleInvoiceCreated(invoice: Stripe.Invoice): Promise<void> {
        if (invoice.billing_reason !== 'subscription_cycle') return;
        if (invoice.status !== 'draft') return;

        const subscriptionId = this.extractSubscriptionId(invoice);
        if (!subscriptionId) return;

        const sub = await this.subscriptionModel
            .findOne({ stripeSubscriptionId: subscriptionId })
            .populate<{ planId: Plan[] }>('planId')
            .lean();

        if (!sub) return;

        const plan = sub.planId[0] as unknown as Plan;

        const cvOverage = Math.max(0, sub.cvUsed - (plan.cvLimit ?? 0));
        const evalOverage = Math.max(
            0,
            sub.evalBlocksUsed - (plan.evalBlocksIncluded ?? 0),
        );

        const overagePromises: Promise<any>[] = [];

        if (cvOverage > 0 && (plan.unitCvPrice ?? 0) > 0) {
            overagePromises.push(
                this.stripe.invoiceItems.create({
                    customer: invoice.customer as string,
                    invoice: invoice.id,
                    amount: Math.round(cvOverage * plan.unitCvPrice * 100),
                    currency: 'usd',
                    description: `CV analysis overage — ${cvOverage} units @ $${plan.unitCvPrice} each`,
                }),
            );
        }

        if (evalOverage > 0 && (plan.evalBlocksPrice ?? 0) > 0) {
            overagePromises.push(
                this.stripe.invoiceItems.create({
                    customer: invoice.customer as string,
                    invoice: invoice.id,
                    amount: Math.round(
                        evalOverage * plan.evalBlocksPrice * 100,
                    ),
                    currency: 'usd',
                    description: `Interview evaluation overage — ${evalOverage} blocks @ $${plan.evalBlocksPrice} each`,
                }),
            );
        }

        if (sub.whatsappManagedActive) {
            const msgOverage = Math.max(
                0,
                sub.whatsappManagedMessagesUsed - WHATSAPP_MESSAGES_INCLUDED,
            );
            if (msgOverage > 0) {
                overagePromises.push(
                    this.stripe.invoiceItems.create({
                        customer: invoice.customer as string,
                        invoice: invoice.id,
                        amount: Math.round(
                            msgOverage * WHATSAPP_MSG_OVERAGE_PRICE * 100,
                        ),
                        currency: 'usd',
                        description: `Managed WhatsApp overage — ${msgOverage} messages @ $${WHATSAPP_MSG_OVERAGE_PRICE} each`,
                    }),
                );
            }
        }

        if (overagePromises.length > 0) {
            await Promise.all(overagePromises);
        }
    }

    private async handleSubscriptionDeleted(
        stripeSub: Stripe.Subscription,
    ): Promise<void> {
        await this.subscriptionModel.findOneAndUpdate(
            { stripeSubscriptionId: stripeSub.id },
            { status: SubscriptionStatus.CANCELED },
        );
    }

    private async handleSubscriptionUpdated(
        stripeSub: Stripe.Subscription,
    ): Promise<void> {
        const whatsappAddonPriceId = this.config.get<string>(
            'stripe.whatsappAddonPriceId',
        );

        const addonItem = whatsappAddonPriceId
            ? stripeSub.items.data.find(
                  (i) => i.price.id === whatsappAddonPriceId,
              )
            : undefined;

        // Identify the plan item (non-addon)
        const planItem = stripeSub.items.data.find(
            (i) => i.price.id !== whatsappAddonPriceId,
        );

        const updateFields: Record<string, any> = {
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            whatsappManagedActive: Boolean(addonItem),
            stripeWhatsappItemId: addonItem?.id ?? null,
        };

        // Sync planId when the plan item's price has changed
        if (planItem?.price?.id) {
            const newPlan = await this.planModel.findOne({
                stripePriceId: planItem.price.id,
            });
            if (newPlan) {
                updateFields.planId = [newPlan._id];
            }
        }

        await this.subscriptionModel.findOneAndUpdate(
            { stripeSubscriptionId: stripeSub.id },
            updateFields,
        );
    }
}
