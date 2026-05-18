import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ScrapeJobDocument = ScrapeJob & Document;

@Schema({ timestamps: true, collection: 'scrapeJobs' })
export class ScrapeJob {
    @Prop({ required: true, index: true })
    site: string;

    @Prop({ required: true })
    title: string;

    @Prop({ default: '' })
    company: string;

    @Prop({ default: '' })
    company_name?: string;

    @Prop({ required: true })
    job_url: string;

    @Prop({ default: '' })
    location: string;

    @Prop({ type: Date, index: true })
    date_posted?: Date;

    @Prop()
    description?: string;

    @Prop()
    job_type?: string;

    @Prop({ default: false })
    is_remote?: boolean;

    @Prop({ default: false })
    easy_apply?: boolean;

    @Prop({ type: MongooseSchema.Types.Mixed, default: null })
    compensation?: any;

    @Prop()
    scraped_at?: Date;

    @Prop()
    last_seen?: Date;
}

export const ScrapeJobSchema = SchemaFactory.createForClass(ScrapeJob);

ScrapeJobSchema.index(
    { site: 1, job_url: 1, date_posted: 1 },
    { unique: true, background: true },
);

// TTL must be a single-field index on a Date field; compound indexes cannot carry expireAfterSeconds
ScrapeJobSchema.index(
    { scraped_at: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 14 },
);
