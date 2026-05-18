import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LinkedInPostVisibility } from '@app/common/enums/app.enums';
import {
    MediaUploadData,
    MediaUploadDataSchema,
} from '@app/common/schemas/media-upload-data.schema';
import mongoose from 'mongoose';

@Schema()
export class JobPostData {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;
    @Prop({ required: false })
    text?: string;
    @Prop({ type: [MediaUploadDataSchema], required: false, Default: [] })
    media?: MediaUploadData[];
    @Prop({
        required: true,
        default: LinkedInPostVisibility.PUBLIC,
        enum: LinkedInPostVisibility,
        type: String,
    })
    visibility: LinkedInPostVisibility;
    @Prop({ required: true })
    targetUrns: string[];
}

export const JobPostDataSchema = SchemaFactory.createForClass(JobPostData);
