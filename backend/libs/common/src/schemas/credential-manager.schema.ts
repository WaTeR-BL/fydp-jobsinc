import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { BaseModel } from '@app/common';
import * as mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import mongoose from 'mongoose';
import {
    SocialCredential,
    SocialCredentialSchema,
} from '@app/common/schemas/social-credential.schema';
import {
    GoogleCredential,
    GoogleCredentialSchema,
} from '@app/common/schemas/google-credential.schema';

export type CredentialManagerDocument = CredentialManager & Document;

@Schema({
    timestamps: true,
    collection: 'credentialManager',
    _id: true,
})
export class CredentialManager extends BaseModel {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({ type: [SocialCredentialSchema], required: false, default: [] })
    socialCredentials: SocialCredential[];

    @Prop({
        type: [GoogleCredentialSchema],
        required: false,
        default: [],
    })
    googleCredentials: GoogleCredential[];
}

export const CredentialManagerSchema =
    SchemaFactory.createForClass(CredentialManager);
CredentialManagerSchema.plugin(mongooseAggregatePaginate);
