import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from './base-model.schema';
import mongoose, { Types } from 'mongoose';
import { Metric, MetricSchema } from './metric.schema';
import {
    InterviewRoundConfig,
    InterviewRoundConfigSchema,
} from './interview-round-config.schema';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { ApplicationChannel, JobStatus } from '../enums/app.enums';
import {
    LinkedInPostInfo,
    LinkedInPostInfoSchema,
} from '@app/common/schemas/linkedin-post-info.schema';
import {
    LinkedInPostFailure,
    LinkedInPostFailureSchema,
} from '@app/common/schemas/linkedin-post-failure.schema';
import {
    JobPostData,
    JobPostDataSchema,
} from '@app/common/schemas/job-post-data.schema';

export type JobDocument = Job & Document;

@Schema({ timestamps: true, collection: 'jobs', _id: true })
export class Job extends BaseModel {
    _id?: Types.ObjectId;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true, enum: JobStatus, type: Number })
    jobStatus: JobStatus;

    @Prop()
    startDate?: Date;

    @Prop()
    endDate?: Date;

    @Prop({ required: true })
    filename: string;

    @Prop({ required: true })
    filepath: string;

    @Prop({ required: true })
    timezone: string;

    @Prop({ required: true })
    url: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Domain',
        required: true,
    })
    domainId: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({
        type: [MetricSchema],
        required: true,
        default: [],
        validate: [
            (arr: Metric[]) => Array.isArray(arr) && arr.length > 0,
            'metrics must not be empty',
        ],
    })
    metrics: Metric[];

    @Prop({ type: [InterviewRoundConfigSchema], default: [], required: false })
    interviewPipeline?: InterviewRoundConfig[];

    @Prop({ default: false })
    isDeleted: boolean;

    @Prop({ type: String })
    startScheduledJobId?: string;

    @Prop({ type: String })
    endScheduledJobId?: string;

    @Prop({ type: String, isRequired: true })
    jobVerificationCode: string;

    @Prop({ default: false })
    linkedInStatus: boolean;

    @Prop({ type: [LinkedInPostInfoSchema], default: [], required: false })
    linkedInPostInfo?: LinkedInPostInfo[];

    @Prop({ required: true, default: false })
    enableJobPosting: boolean;

    @Prop({ type: JobPostDataSchema, required: false, default: null })
    postData?: JobPostData;

    @Prop({
        type: [String],
        enum: ApplicationChannel,
        default: [ApplicationChannel.WHATSAPP],
    })
    applicationChannels: ApplicationChannel[];

    @Prop({ type: [LinkedInPostFailureSchema], default: [], required: false })
    linkedInFailedPosts?: LinkedInPostFailure[];
}

export const JobSchema = SchemaFactory.createForClass(Job);
JobSchema.plugin(mongooseAggregatePaginate);
