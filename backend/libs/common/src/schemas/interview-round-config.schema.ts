import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { CheckList, CheckListSchema } from './checklist.schema';
import { InterviewType } from '../enums/app.enums';

@Schema({ _id: true })
export class InterviewRoundConfig {
    _id?: Types.ObjectId;

    @Prop({ required: true })
    roundNumber: number;

    @Prop({ required: true })
    roundName: string;

    @Prop({ required: true, enum: InterviewType, type: Number })
    interviewType: InterviewType;

    @Prop({ type: [CheckListSchema], default: [] })
    checkLists: CheckList[];

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Interviewer',
        required: false,
    })
    defaultInterviewerId?: mongoose.Types.ObjectId;

    @Prop({ default: false })
    isOptional: boolean;
}

export const InterviewRoundConfigSchema =
    SchemaFactory.createForClass(InterviewRoundConfig);
