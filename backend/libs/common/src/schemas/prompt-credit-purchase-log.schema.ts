import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true, collection: 'promptCreditPurchaseLogs', _id: true })
export class PromptCreditPurchaseLog {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    user: mongoose.Types.ObjectId;

    @Prop({ required: true })
    amount: number;

    @Prop({ required: true })
    creditsPurchased: number;

    @Prop({ required: true })
    paymentIntentId: string;

    @Prop({ required: true })
    paymentStatus: boolean;
}
export const PromptCreditPurchaseLogSchema = SchemaFactory.createForClass(
    PromptCreditPurchaseLog,
);
