import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class LinkedInPostInfo {
    @Prop({ required: true })
    urnId: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    url: string;

    @Prop({ required: true })
    postedAt: Date;
}

export const LinkedInPostInfoSchema =
    SchemaFactory.createForClass(LinkedInPostInfo);
