import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: true })
export class MediaUploadData {
    _id?: Types.ObjectId;

    @Prop({ required: true })
    asset: string;

    @Prop({ required: true })
    status: 'READY' | 'PROCESSING';

    @Prop({ required: false })
    title?: string;

    @Prop({ required: false })
    description?: string;
}

export const MediaUploadDataSchema =
    SchemaFactory.createForClass(MediaUploadData);
