import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { WebhookEventStatus } from '../enums/app.enums';

@Schema({ timestamps: true, collection: 'webhookEvents', _id: true })
export class WebhookEvent {
    @Prop({ required: true, unique: true })
    stripeEventId: string;

    @Prop({ required: true })
    type: string;

    @Prop({ type: Object })
    payload: Record<string, any>;

    @Prop({
        enum: WebhookEventStatus,
        type: Number,
        default: WebhookEventStatus.RECEIVED,
    })
    status: WebhookEventStatus;

    @Prop({ default: 0 })
    attempts: number;

    @Prop()
    processedAt?: Date;

    @Prop()
    error?: string;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);
