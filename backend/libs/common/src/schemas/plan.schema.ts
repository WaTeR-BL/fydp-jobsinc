import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PlanType } from '../enums/app.enums';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

export type PlanDocument = Plan & Document;

@Schema({ timestamps: true, collection: 'plans', _id: true })
export class Plan {
    @Prop({ required: true, unique: true })
    name: string;

    @Prop({ required: true, enum: PlanType, type: Number })
    type: PlanType;

    @Prop()
    price?: number;

    @Prop()
    cvLimit?: number;

    @Prop({ default: false })
    socialIntegration: boolean;

    @Prop({ default: false })
    aiAssistance: boolean;

    @Prop({ default: false })
    aiSummary: boolean;

    @Prop({ default: false })
    googleMeetLink: boolean;

    @Prop()
    reminderMessages?: number;

    @Prop({ default: false })
    bulkUploadCv: boolean;

    @Prop({ default: false })
    aiNoteTaking: boolean;

    @Prop()
    unitCvPrice?: number;

    @Prop()
    unitReminderPrice?: number;

    @Prop()
    addonPrice?: number;

    @Prop({ default: false })
    whatsappIntegration?: boolean;

    @Prop()
    freePromptCredit?: number;

    @Prop({ required: true, default: true })
    status: boolean;

    @Prop({ required: true })
    sequence: number;

    @Prop()
    stripeProductId?: string;

    @Prop()
    stripePriceId?: string;

    @Prop()
    evalBlocksIncluded?: number;

    @Prop()
    evalBlocksPrice?: number;

    @Prop()
    interviewerSeats?: number;

    @Prop()
    activeJobsLimit?: number;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
PlanSchema.plugin(mongooseAggregatePaginate);
