import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true, collection: 'promptAccounts', _id: true })
export class PromptAccount {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        unique: true,
    })
    tenant: mongoose.Types.ObjectId;

    @Prop({ default: 0 })
    creditBalance: number;

    @Prop({ required: true, default: true })
    status: boolean;
}
export const PromptAccountSchema = SchemaFactory.createForClass(PromptAccount);
