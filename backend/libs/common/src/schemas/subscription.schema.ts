import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

import { SubscriptionStatus } from '../enums/app.enums';

@Schema({ timestamps: true, collection: 'subscriptions', _id: true })
export class Subscription {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Plan',
        required: true,
    })
    planId: mongoose.Types.ObjectId[];

    @Prop({ required: true, enum: SubscriptionStatus, type: Number })
    status: SubscriptionStatus;

    @Prop()
    startDate: Date;

    @Prop()
    endDate?: Date;

    @Prop()
    lastBilledAt?: Date;

    @Prop({ default: 0 })
    cvUsed: number;

    @Prop({ default: 0 })
    remindersUsed: number;

    @Prop({ default: false })
    autoPayment: boolean;

    @Prop()
    stripeSubscriptionId?: string;

    @Prop()
    currentPeriodStart?: Date;

    @Prop()
    currentPeriodEnd?: Date;

    @Prop({ default: 0 })
    evalBlocksUsed: number;

    @Prop({ default: false })
    cancelAtPeriodEnd: boolean;

    @Prop({ default: false })
    whatsappManagedActive: boolean;

    @Prop({ default: 0 })
    whatsappManagedMessagesUsed: number;

    @Prop()
    stripeWhatsappItemId?: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
