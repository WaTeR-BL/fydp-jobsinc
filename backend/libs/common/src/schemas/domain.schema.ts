import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from './base-model.schema';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import mongoose from 'mongoose';

export type DomainDocument = Domain & Document;

@Schema({ timestamps: true, collection: 'domains', _id: true })
export class Domain extends BaseModel {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({ required: true })
    title: string;

    @Prop()
    description?: string;

    @Prop()
    tags?: string[];

    @Prop({ default: true })
    status: boolean;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const DomainSchema = SchemaFactory.createForClass(Domain);
DomainSchema.plugin(mongooseAggregatePaginate);
