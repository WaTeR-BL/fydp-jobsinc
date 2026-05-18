import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type TenantEmailTemplateDocument = TenantEmailTemplate & Document;

@Schema({ collection: 'tenantEmailTemplates', _id: true, timestamps: true })
export class TenantEmailTemplate {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;

    /**
     * Matches EmailTemplate enum values — only customizable types are stored here.
     * System-only templates (applicantUserCreation, resetPassword) are never persisted.
     */
    @Prop({ type: String, required: true })
    templateType: string;

    /** Handlebars template string for the email subject line */
    @Prop({ type: String, required: true })
    subject: string;

    /** Handlebars template string for the HTML body */
    @Prop({ type: String, required: true })
    htmlContent: string;
}

export const TenantEmailTemplateSchema =
    SchemaFactory.createForClass(TenantEmailTemplate);

// One custom template per type per tenant
TenantEmailTemplateSchema.index(
    { tenantId: 1, templateType: 1 },
    { unique: true },
);
