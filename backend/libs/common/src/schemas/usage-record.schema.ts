import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { PayGType } from '../enums/app.enums';

@Schema({ timestamps: true, collection: 'usageRecord', _id: true })
export class UsageRecord {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        required: true,
    })
    subscriptionId: mongoose.Types.ObjectId;

    @Prop({ required: true, enum: PayGType, type: Number })
    payGType: PayGType;

    @Prop({ required: true })
    units: number;

    @Prop({ required: true })
    timestamp: Date;

    @Prop({ default: false })
    paymentStatus: boolean;
}
export const UsageRecordSchema = SchemaFactory.createForClass(UsageRecord);
