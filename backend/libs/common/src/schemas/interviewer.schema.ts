import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from '@app/common';
import mongoose from 'mongoose';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { TimeSlot, TimeSlotSchema } from '@app/common/schemas/time-slot.schema';

export type InterviewerDocument = Interviewer & Document;

@Schema({ timestamps: true, collection: 'interviewers', _id: true })
export class Interviewer extends BaseModel {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    })
    userId: mongoose.Types.ObjectId;

    @Prop({
        type: [TimeSlotSchema],
        required: true,
        default: undefined,
        validate: [
            (arr: TimeSlot[]) => Array.isArray(arr) && arr.length > 0,
            'time slots must not be empty',
        ],
    })
    timeSlots: TimeSlot[];
}

export const InterviewerSchema = SchemaFactory.createForClass(Interviewer);
InterviewerSchema.plugin(mongooseAggregatePaginate);
