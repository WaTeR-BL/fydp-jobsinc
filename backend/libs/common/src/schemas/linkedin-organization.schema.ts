import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class LinkedInOrganization {
    @Prop({ required: true })
    organizationId: string;

    @Prop({ required: true })
    name: string;
}

export const LinkedInOrganizationSchema =
    SchemaFactory.createForClass(LinkedInOrganization);
