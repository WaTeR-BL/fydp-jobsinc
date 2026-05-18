import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from './base-model.schema';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import mongoose from 'mongoose';

export type InterviewTranscriptDocument = InterviewTranscript & Document;

@Schema({ timestamps: true, collection: 'interviewTranscripts', _id: true })
export class InterviewTranscript extends BaseModel {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewRecording',
        required: true,
    })
    interviewRecordingId: mongoose.Types.ObjectId;

    @Prop({ required: true })
    provider: string; // 'assemblyai'

    @Prop({ required: true })
    providerJobId: string; // AssemblyAI transcript ID

    @Prop({ required: true })
    languageCode: string; // e.g., 'en'

    @Prop({ required: true })
    audioDuration: number; // milliseconds from AssemblyAI

    @Prop({ type: Number })
    averageConfidence?: number; // Average confidence score 0-1

    // Cleaned speaker turns: simplified conversation flow
    @Prop({ type: [Object], required: true })
    speakerTurns: Array<{
        speaker: string; // 'Interviewer' | 'Candidate'
        text: string; // Cleaned text for this turn
    }>;
}

export const InterviewTranscriptSchema =
    SchemaFactory.createForClass(InterviewTranscript);
InterviewTranscriptSchema.plugin(mongooseAggregatePaginate);
