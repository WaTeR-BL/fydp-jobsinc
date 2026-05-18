import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SocialType } from '@app/common/enums/app.enums';
import {
    LinkedInOrganization,
    LinkedInOrganizationSchema,
} from '@app/common/schemas/linkedin-organization.schema';

@Schema({ _id: false })
export class SocialCredential {
    @Prop({ required: true, enum: SocialType, type: Number })
    type: SocialType;

    @Prop({ required: true })
    accessToken: string;

    @Prop({ required: true })
    expiresAt: Date;

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    urnId: string;

    @Prop({ type: [LinkedInOrganizationSchema], default: null })
    organizations?: LinkedInOrganization[];

    @Prop({ required: false })
    refreshToken?: string;

    @Prop({ required: false })
    refreshTokenExpiresAt?: Date;
}

export const SocialCredentialSchema =
    SchemaFactory.createForClass(SocialCredential);
