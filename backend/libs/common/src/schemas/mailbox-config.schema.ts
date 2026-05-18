import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type MailboxConfigDocument = MailboxConfig & Document;

@Schema({ collection: 'mailboxConfigs', _id: true, timestamps: true })
export class MailboxConfig {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        unique: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({ type: String, required: true })
    imapHost: string;

    @Prop({ type: Number, required: true })
    imapPort: number;

    @Prop({ type: String, required: true })
    imapUser: string;

    /** AES-256-GCM encrypted password — format: iv:tag:ciphertext (hex) */
    @Prop({ type: String, required: true })
    imapPasswordEnc: string;

    @Prop({ type: Boolean, default: true })
    useSSL: boolean;

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    /** UID high-water mark — only emails with UID > this value are fetched */
    @Prop({ type: Number, default: 0 })
    lastSeenUid: number;

    @Prop({ type: Boolean, default: false })
    isVerified: boolean;

    @Prop({ type: Date, required: false })
    verifiedAt?: Date;
}

export const MailboxConfigSchema = SchemaFactory.createForClass(MailboxConfig);
