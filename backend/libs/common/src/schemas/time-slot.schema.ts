import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, _id: true })
export class TimeSlot {
    _id?: Types.ObjectId;
    @Prop({ required: true })
    startTime: Date;
    @Prop({ required: true })
    endTime: Date;
    @Prop({ default: false, required: true })
    selected: boolean;
    @Prop({ default: false, required: true })
    isDeleted: boolean;
    @Prop({ default: false, required: true })
    reserved: boolean;
}

export const TimeSlotSchema = SchemaFactory.createForClass(TimeSlot);
