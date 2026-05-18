import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from './base-model.schema';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

export type ApplicantDocument = Applicant & Document;

@Schema({ timestamps: true, collection: 'applicants', _id: true })
export class Applicant extends BaseModel {
    @Prop({ required: true })
    fullName: string;

    @Prop({ required: true })
    email: string;

    @Prop()
    contact?: string;

    @Prop({ required: false })
    timezone?: string;

    @Prop({ required: false, default: null })
    password?: string;

    @Prop({ required: false })
    hashedRefreshToken?: string;
}

export const ApplicantSchema = SchemaFactory.createForClass(Applicant);
ApplicantSchema.plugin(mongooseAggregatePaginate);
