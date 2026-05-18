import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { VerificationStatus } from '../enums/app.enums';

@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    emailAddress: string;

    @Prop({ required: true, unique: true })
    domain: string;

    @Prop()
    address: string;

    @Prop({ default: true })
    status: boolean;

    @Prop({ default: false })
    googleAuthorized: boolean;

    @Prop({ required: false })
    liveContact: string;

    @Prop({ required: false })
    businessId: string;

    @Prop({ required: true })
    websiteUrl: string;

    @Prop({ required: false })
    InformationPDFUrl: string;

    @Prop({
        enum: VerificationStatus,
        default: VerificationStatus.VERIFIED,
        type: Number,
    })
    verificationStatus: VerificationStatus;

    @Prop({ required: false })
    logoUrl?: string;

    @Prop({ required: false })
    sesMail?: string;

    @Prop({ required: true })
    contactEmail: string;

    @Prop()
    stripeCustomerId?: string;

    @Prop({ required: false })
    whatsappAccessToken?: string;

    @Prop({ required: false })
    healthCheckNumber?: string;

    @Prop({ required: false })
    whatsappStatusMessage?: string;

    @Prop({ required: false })
    lastWhatsappHealthCheck?: Date;

    @Prop({ required: false, default: false })
    whatsappHealthStatus?: boolean;

    @Prop({ required: false })
    lastForceCheckDate?: Date;

    @Prop({ required: false, default: 0 })
    forceCheckCount?: number;

    @Prop({ required: false, default: 5, min: 1 })
    slaDays?: number;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
