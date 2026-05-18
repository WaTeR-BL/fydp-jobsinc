import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from './base-model.schema';
import mongoose from 'mongoose';
import { IntegrationExecutionStatus } from '../enums/app.enums';

export type IntegrationExecutionDocument = IntegrationExecution & Document;

@Schema({ timestamps: true, collection: 'integrationExecutions', _id: true })
export class IntegrationExecution extends BaseModel {
    _id: mongoose.Types.ObjectId;
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IntegrationConfig',
        required: true,
    })
    configId: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplicantJobFeedback',
        required: true,
        index: true,
    })
    feedbackId: mongoose.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.Mixed, required: true })
    candidateSnapshot: Record<string, any>;

    @Prop({ type: mongoose.Schema.Types.Mixed, required: true, default: {} })
    extraDataSnapshot: Record<string, any>;

    @Prop({
        required: true,
        enum: IntegrationExecutionStatus,
        default: IntegrationExecutionStatus.PENDING,
        type: String,
    })
    status: IntegrationExecutionStatus;

    @Prop({ type: String, required: false, default: null })
    error: string | null;

    @Prop({ type: Number, default: 0 })
    attemptCount: number;

    @Prop({ type: Date, required: false, default: null })
    lastAttemptAt: Date | null;
}

export const IntegrationExecutionSchema =
    SchemaFactory.createForClass(IntegrationExecution);
