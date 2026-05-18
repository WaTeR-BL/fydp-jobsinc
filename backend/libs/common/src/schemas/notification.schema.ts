import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import mongoose from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications', _id: true })
export class Notification {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    })
    userId: mongoose.Types.ObjectId;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    @Prop({ type: Object, default: {} })
    data: Record<string, any>;

    @Prop({ default: false })
    read: boolean;

    @Prop()
    readAt?: Date;

    @Prop()
    expiresAt?: Date;

    createdAt: Date;

    updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.plugin(mongooseAggregatePaginate);
