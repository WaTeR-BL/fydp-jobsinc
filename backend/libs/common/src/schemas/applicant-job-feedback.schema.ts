import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MetricAnalysis } from './metric-analysis.schema';
import mongoose from 'mongoose';
import { ApplicationSource, ApplicantJobStatus } from '../enums/app.enums';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

export type ApplicantJobFeedbackDocument = ApplicantJobFeedback & Document;

@Schema({ collection: 'applicantJobFeedbacks', _id: true, timestamps: true })
export class ApplicantJobFeedback {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Applicant',
        required: true,
    })
    applicantId: mongoose.Types.ObjectId;

    @Prop({ required: true })
    email: string;

    @Prop({ required: true, enum: ApplicantJobStatus, type: Number })
    applicantStatus: ApplicantJobStatus;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
    })
    jobId: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({ type: String, required: false })
    feedback?: string;

    @Prop({ type: Number, required: false })
    cvMatch?: number;

    @Prop({ type: String, required: true })
    cvUrl: string;

    @Prop({ type: String, required: false })
    video?: string;

    @Prop({ type: Boolean, default: false })
    isProcessCompleted: boolean;

    @Prop({ type: Number, default: 0 })
    currentRound: number;

    @Prop({ type: Number, default: 0 })
    totalRoundsCompleted: number;

    @Prop({ type: [Number], default: [] })
    completedRounds: number[];

    @Prop({ type: Boolean, default: false })
    isRejected: boolean;

    @Prop({ type: Boolean, default: false })
    isHired: boolean;

    @Prop({
        type: [MetricAnalysis],
        required: false,
        default: undefined,
    })
    analysis?: MetricAnalysis[];

    @Prop({ type: String, enum: ApplicationSource, required: false })
    source?: ApplicationSource;
}

export const ApplicantJobFeedbackSchema =
    SchemaFactory.createForClass(ApplicantJobFeedback);
ApplicantJobFeedbackSchema.plugin(mongooseAggregatePaginate);
