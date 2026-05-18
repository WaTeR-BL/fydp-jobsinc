import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from './base-model.schema';
import mongoose from 'mongoose';
import { Document } from 'mongoose';

export type IntegrationRefCacheDocument = IntegrationRefCache & Document;

@Schema({ timestamps: true, collection: 'integrationRefCache', _id: true })
export class IntegrationRefCache extends BaseModel {
    _id: mongoose.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
    tenantId: mongoose.Types.ObjectId;

    @Prop({ required: true })
    tableKey: string;

    @Prop({ required: true })
    query: string;

    @Prop({ type: [mongoose.Schema.Types.Mixed], default: [] })
    data: Record<string, any>[];

    @Prop({ type: Date, required: true })
    lastSyncedAt: Date;
}

export const IntegrationRefCacheSchema =
    SchemaFactory.createForClass(IntegrationRefCache);
IntegrationRefCacheSchema.index({ tenantId: 1, tableKey: 1 }, { unique: true });
