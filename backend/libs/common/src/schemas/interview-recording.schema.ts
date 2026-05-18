import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from './base-model.schema';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import mongoose from 'mongoose';

export type InterviewRecordingDocument = InterviewRecording & Document;

@Schema({ timestamps: true, collection: 'interviewRecordings', _id: true })
export class InterviewRecording extends BaseModel {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplicantInterview',
        required: false,
    })
    applicantInterviewId?: mongoose.Types.ObjectId;

    @Prop({ required: true })
    audioUrl: string; // S3 URL

    @Prop({ required: true })
    filename: string;

    @Prop({ required: true })
    fileSize: number; // bytes

    @Prop({ required: true })
    mimeType: string; // audio/webm, audio/wav, etc.

    @Prop({ required: true })
    duration: number; // seconds

    @Prop()
    recordedAt?: Date;

    @Prop({
        type: String,
        enum: ['queued', 'processing', 'completed', 'failed'],
        default: 'queued',
    })
    status: string;

    @Prop({ type: Object })
    metadata?: {
        meetingUrl?: string;
        platform?: string; // 'google-meet'
        uploadedBy?: string;
    };

    @Prop()
    errorMessage?: string;
}

export const InterviewRecordingSchema =
    SchemaFactory.createForClass(InterviewRecording);
InterviewRecordingSchema.plugin(mongooseAggregatePaginate);
