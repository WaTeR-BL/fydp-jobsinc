import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from './base-model.schema';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import mongoose from 'mongoose';

export type InterviewEvaluationDocument = InterviewEvaluation & Document;

@Schema({ timestamps: true, collection: 'interviewEvaluations', _id: true })
export class InterviewEvaluation extends BaseModel {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewTranscript',
        required: true,
        unique: true,
        index: true,
    })
    transcriptId: mongoose.Types.ObjectId;

    // Denormalized for query optimization (avoid joins)
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplicantInterview',
        required: true,
        index: true,
    })
    applicantInterviewId: mongoose.Types.ObjectId;

    // Denormalized: Job ID for quick filtering by job
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        index: true,
    })
    jobId: mongoose.Types.ObjectId;

    // Individual checklist results
    @Prop({
        type: [
            {
                checklistId: mongoose.Schema.Types.ObjectId,
                criterion: String, // Denormalized for display (snapshot at eval time)
                category: String, // Denormalized for grouping
                score: Number, // The assigned score (e.g., 1-5)
                justification: String, // AI explanation
                evidence: [String], // Relevant quotes from transcript
                confidence: Number, // AI confidence 0-1
            },
        ],
        required: true,
    })
    results: Array<{
        checklistId: mongoose.Types.ObjectId;
        criterion: string;
        category: string;
        score: number;
        justification: string;
        evidence: string[];
        confidence: number;
    }>;

    // Overall evaluation metadata
    @Prop({ type: String })
    overallSummary?: string;

    @Prop({
        type: String,
        enum: ['strong_yes', 'yes', 'neutral', 'no', 'strong_no'],
    })
    recommendation?: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';

    // Aggregate scores for quick stats
    @Prop({ type: Number })
    averageScore?: number; // Average across all checklist items

    @Prop({ type: Number })
    averageConfidence?: number; // Average confidence across all items

    // Processing metadata
    @Prop({ type: String, default: 'pending' })
    status: 'pending' | 'processing' | 'completed' | 'failed';

    @Prop({ type: String })
    errorMessage?: string;

    @Prop({ type: Date })
    evaluatedAt?: Date; // When evaluation completed

    @Prop({ type: String })
    model?: string; // AI model used (e.g., 'gpt-4', 'claude-3-opus')

    @Prop({ type: Number })
    processingTimeMs?: number; // How long evaluation took
}

export const InterviewEvaluationSchema =
    SchemaFactory.createForClass(InterviewEvaluation);

// Indexes for common queries
InterviewEvaluationSchema.index({ applicantInterviewId: 1, createdAt: -1 });
InterviewEvaluationSchema.index({ jobId: 1, recommendation: 1 });
InterviewEvaluationSchema.index({ status: 1, createdAt: 1 });

InterviewEvaluationSchema.plugin(mongooseAggregatePaginate);
