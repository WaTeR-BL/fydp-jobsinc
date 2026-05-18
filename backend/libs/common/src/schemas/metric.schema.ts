import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, _id: true })
export class Metric {
    _id?: Types.ObjectId;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({ default: true })
    status?: boolean;
}

export const MetricSchema = SchemaFactory.createForClass(Metric);
