import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: true })
export class MetricAnalysis {
    @Prop({ required: false, type: Types.ObjectId })
    metricId?: Types.ObjectId;

    @Prop({ required: false, type: Number })
    percentage?: number;
}

export const MetricAnalysisSchema =
    SchemaFactory.createForClass(MetricAnalysis);
