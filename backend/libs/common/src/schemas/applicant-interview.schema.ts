import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from '@app/common';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import mongoose from 'mongoose';
import {
    InterviewStatus,
    InterviewType,
    RoundOutcome,
} from '@app/common/enums/app.enums';
import { CheckList, CheckListSchema } from './checklist.schema';

export type ApplicantInterviewDocument = ApplicantInterview & Document;

@Schema({ timestamps: true, collection: 'applicantInterviews', _id: true })
export class ApplicantInterview extends BaseModel {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplicantJobFeedback',
        required: true,
    })
    applicantJobFeedbackId: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        index: true,
    })
    jobId: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Interviewer',
        required: true,
        index: true,
    })
    interviewerId: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    })
    timeSlotId?: mongoose.Types.ObjectId;

    @Prop({ type: [String], required: false, default: [] })
    attendees: string[];

    @Prop({ type: Date, required: false, index: true })
    scheduledAt?: Date;

    @Prop({ type: Date, required: false })
    scheduledEndTime?: Date;

    @Prop({
        type: Number,
        enum: InterviewType,
        required: true,
    })
    interviewType: InterviewType;

    @Prop({
        type: Number,
        enum: InterviewStatus,
        default: InterviewStatus.PENDING,
        required: true,
    })
    status: InterviewStatus;

    @Prop({ type: String, sparse: true, index: true })
    meetId?: string;

    @Prop({ type: String })
    meetLink?: string;

    @Prop({ type: String })
    hangoutLink?: string;

    @Prop({ type: String })
    onsiteLocation?: string;

    @Prop({ type: String })
    onsiteAddress?: string;

    @Prop({ type: String })
    onsiteInstructions?: string;

    @Prop({ type: Number })
    duration?: number;

    @Prop({ type: String })
    notes?: string;

    @Prop({ type: String })
    cancellationReason?: string;

    @Prop({ type: Date })
    cancelledAt?: Date;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    cancelledBy?: mongoose.Types.ObjectId;

    @Prop({ type: Date })
    completedAt?: Date;

    @Prop({ type: Boolean, default: false, required: true })
    isSlotChanged: boolean;

    @Prop({ type: Boolean, default: false, required: true })
    isCompleted: boolean;

    @Prop({ type: Number, default: 0 })
    rescheduleCount: number;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplicantInterview',
    })
    previousInterviewId?: mongoose.Types.ObjectId;

    @Prop({ type: Boolean, default: false })
    emailSent: boolean;

    @Prop({ type: Date })
    emailSentAt?: Date;

    @Prop({ type: Number, required: true, default: 1 })
    roundNumber: number;

    @Prop({ type: String, required: true, default: '' })
    roundName: string;

    @Prop({ type: [CheckListSchema], default: [] })
    roundCheckLists: CheckList[];

    @Prop({ type: String, enum: RoundOutcome, required: false })
    roundOutcome?: RoundOutcome;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    })
    outcomeDecidedBy?: mongoose.Types.ObjectId;

    @Prop({ type: String, required: false })
    outcomeNotes?: string;
}

export const ApplicantInterviewSchema =
    SchemaFactory.createForClass(ApplicantInterview);

ApplicantInterviewSchema.index(
    { applicantJobFeedbackId: 1, roundNumber: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: {
                $in: [
                    InterviewStatus.PENDING,
                    InterviewStatus.SCHEDULED,
                    InterviewStatus.RESCHEDULED,
                ],
            },
        },
    },
);

ApplicantInterviewSchema.plugin(mongooseAggregatePaginate);
