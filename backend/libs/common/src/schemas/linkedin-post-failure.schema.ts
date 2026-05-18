import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class LinkedInPostFailure {
    /** LinkedIn target URN (personal profile or org page) */
    @Prop({ required: true })
    targetUrn: string;

    /** Display name of the account / page */
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    failedAt: Date;

    /** Human-readable error returned by LinkedIn or the queue */
    @Prop({ required: true })
    reason: string;

    /** Post text — stored so retries don't need a separate lookup */
    @Prop({ required: false })
    text?: string;

    @Prop({ required: false, default: 'PUBLIC' })
    visibility: string;
}

export const LinkedInPostFailureSchema =
    SchemaFactory.createForClass(LinkedInPostFailure);
