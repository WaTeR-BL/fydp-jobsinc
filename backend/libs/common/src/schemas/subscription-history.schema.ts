import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { PaymentStatus } from '../enums/app.enums';

@Schema({ timestamps: true, collection: 'subscriptionHistories', _id: true })
export class SubscriptionTransactionHistory {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        required: true,
    })
    subscriptionId: mongoose.Types.ObjectId;

    @Prop({ required: true })
    amount: number;

    @Prop({ required: true, enum: PaymentStatus, type: Number })
    status: PaymentStatus;

    @Prop()
    paymentIntentId?: string;
}
export const SubscriptionTransactionSchema = SchemaFactory.createForClass(
    SubscriptionTransactionHistory,
);
