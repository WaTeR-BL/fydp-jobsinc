/**
 * Plan Seed Script
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register apps/core/src/plan/plan.seed.ts
 *
 * NOTE: STRIPE_GROWTH_PRICE_ID / STRIPE_BUSINESS_PRICE_ID / STRIPE_WHATSAPP_ADDON_PRICE_ID
 * in .env should contain Stripe PRICE IDs (price_xxx), not Product IDs (prod_xxx).
 * Each Stripe product has one or more prices — get the price ID from:
 * Stripe Dashboard → Products → click product → copy "Price ID" (starts with price_)
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI;
const GROWTH_PRICE_ID = process.env.STRIPE_GROWTH_PRICE_ID || '';
const BUSINESS_PRICE_ID = process.env.STRIPE_BUSINESS_PRICE_ID || '';
const WHATSAPP_ADDON_PRICE_ID =
    process.env.STRIPE_WHATSAPP_ADDON_PRICE_ID || '';

// PlanType enum values (mirrors libs/common/src/enums/app.enums.ts)
const PlanType = { TIER: 0, ADDON: 1, PAY_AS_YOU_GO: 2, PROMPT: 3 };

const PlanSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        type: { type: Number, required: true },
        price: Number,
        cvLimit: Number,
        socialIntegration: { type: Boolean, default: false },
        aiAssistance: { type: Boolean, default: false },
        aiSummary: { type: Boolean, default: false },
        googleMeetLink: { type: Boolean, default: false },
        reminderMessages: Number,
        bulkUploadCv: { type: Boolean, default: false },
        aiNoteTaking: { type: Boolean, default: false },
        unitCvPrice: Number,
        unitReminderPrice: Number,
        addonPrice: Number,
        whatsappIntegration: { type: Boolean, default: false },
        freePromptCredit: Number,
        status: { type: Boolean, default: true },
        sequence: { type: Number, required: true },
        stripeProductId: String,
        stripePriceId: String,
        evalBlocksIncluded: Number,
        evalBlocksPrice: Number,
        interviewerSeats: Number,
        activeJobsLimit: Number,
    },
    { timestamps: true, collection: 'plans' },
);

const plans = [
    {
        name: 'Growth',
        type: PlanType.TIER,
        price: 49,
        cvLimit: 100,
        socialIntegration: true,
        aiAssistance: true,
        aiSummary: true,
        googleMeetLink: true,
        reminderMessages: 500,
        bulkUploadCv: true,
        aiNoteTaking: false,
        unitCvPrice: 0.5,
        unitReminderPrice: 0,
        addonPrice: 0,
        whatsappIntegration: true,
        freePromptCredit: 10,
        status: true,
        sequence: 1,
        stripePriceId: GROWTH_PRICE_ID,
        evalBlocksIncluded: 50,
        evalBlocksPrice: 1.0,
        interviewerSeats: 3,
        activeJobsLimit: 10,
    },
    {
        name: 'Business',
        type: PlanType.TIER,
        price: 149,
        cvLimit: 500,
        socialIntegration: true,
        aiAssistance: true,
        aiSummary: true,
        googleMeetLink: true,
        reminderMessages: 2000,
        bulkUploadCv: true,
        aiNoteTaking: true,
        unitCvPrice: 0.3,
        unitReminderPrice: 0,
        addonPrice: 0,
        whatsappIntegration: true,
        freePromptCredit: 50,
        status: true,
        sequence: 2,
        stripePriceId: BUSINESS_PRICE_ID,
        evalBlocksIncluded: 200,
        evalBlocksPrice: 0.75,
        interviewerSeats: 10,
        activeJobsLimit: 50,
    },
    {
        name: 'Managed WhatsApp Add-on',
        type: PlanType.ADDON,
        price: 20,
        cvLimit: 0,
        socialIntegration: false,
        aiAssistance: false,
        aiSummary: false,
        googleMeetLink: false,
        reminderMessages: 0,
        bulkUploadCv: false,
        aiNoteTaking: false,
        unitCvPrice: 0,
        unitReminderPrice: 0,
        addonPrice: 29,
        whatsappIntegration: false,
        freePromptCredit: 0,
        status: true,
        sequence: 10,
        stripePriceId: WHATSAPP_ADDON_PRICE_ID,
        evalBlocksIncluded: 0,
        evalBlocksPrice: 0,
        interviewerSeats: 0,
        activeJobsLimit: 0,
    },
];

async function seed() {
    if (!MONGO_URI) {
        console.error('MONGO_URI not set in .env');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const PlanModel = mongoose.model('Plan', PlanSchema);

    for (const plan of plans) {
        const result = await PlanModel.findOneAndUpdate(
            { name: plan.name },
            { $set: plan },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        console.log(`Upserted plan: ${result.name} (${result._id})`);
    }

    await mongoose.disconnect();
    console.log('Done. Disconnected from MongoDB.');
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
