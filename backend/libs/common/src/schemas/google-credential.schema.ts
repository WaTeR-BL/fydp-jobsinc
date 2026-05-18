import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema({ _id: false })
export class GoogleCredential {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    })
    userId: mongoose.Types.ObjectId;

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    accessToken: string;

    @Prop({ required: true })
    refreshToken: string;

    @Prop({ required: true })
    expiresAt: Date;
}

export const GoogleCredentialSchema =
    SchemaFactory.createForClass(GoogleCredential);
