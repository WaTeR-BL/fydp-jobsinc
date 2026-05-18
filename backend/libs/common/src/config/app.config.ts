import * as process from 'node:process';

export default () => ({
    node: {
        environment: process.env.NODE_ENV,
    },
    whatsapp: {
        apiUrl: process.env.FACEBOOK_WHATSAPP_API_URL || '',
        token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
        jobsincBusinessId: process.env.JOBSINC_BUSINESS_ID || '',
        jobsincLiveContact: process.env.JOBSINC_LIVE_CONTACT || '',
    },
    redis: {
        host: process.env.REDIS_HOST || '',
        port: parseInt(process.env.REDIS_PORT),
    },
    rabbitmq: {
        uri: process.env.RABBIT_MQ_URI || '',
    },
    mongo: {
        uri: process.env.MONGO_URI || '',
    },
    groq: {
        apiKey: process.env.GROQ_API_KEY,
        fallbackModel: process.env.GROQ_FALLBACK_MODEL,
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
    },
    assemblyai: {
        apiKey: process.env.ASSEMBLYAI_API_KEY,
    },
    pinecone: {
        apiKey: process.env.PINECONE_API_KEY,
        indexName: process.env.PINECONE_INDEX_NAME,
    },
    server: {
        port: 3003,
        nodeEnv: 'production',
    },
    indeed: {
        apiKey: process.env.INDEED_API_KEY || '',
    },
    scrape: {
        defaultCountry: process.env.SCRAPE_DEFAULT_COUNTRY || 'pk',
        defaultLocation: process.env.SCRAPE_DEFAULT_LOCATION || 'Pakistan',
        resultsWanted:
            parseInt(process.env.SCRAPE_RESULTS_WANTED ?? '', 10) || 20,
        intervalMinutes:
            parseInt(process.env.SCRAPE_INTERVAL_MINUTES ?? '', 10) || 30,
    },
    secret: {
        access: process.env.AT_SECRET || '',
        refresh: process.env.RT_SECRET || '',
    },
    google: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        scopes: process.env.GOOGLE_SCOPES.split(',') || [],
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    },
    media: {
        url: process.env.MEDIA_UPLOAD_URL || '',
    },
    linkedin: {
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI || '',
        auth: process.env.LINKEDIN_AUTH || '',
        access: process.env.LINKEDIN_ACCESS || '',
        org: process.env.LINKEDIN_ORG || '',
        org_details: process.env.LINKEDIN_ORG_DETAILS || '',
        email: process.env.LINKEDIN_EMAIL || '',
        scope: process.env.LINKEDIN_SCOPE || '',
        user_info: process.env.LINKEDIN_USER_INFO || '',
        register_upload_media_url: process.env.REGISTER_UPLOAD_MEDIA_URL || '',
        register_upload_video_url: process.env.REGISTER_UPLOAD_VIDEO_URL || '',
        share_url: process.env.SHARE_URL || '',
    },
    port: {
        core: process.env.CORE_PORT,
        bot: process.env.BOT_PORT,
    },
    spaces: {
        access_key: process.env.SPACES_ACCESS_KEY,
        secret_key: process.env.SPACES_SECRET_KEY,
        region: process.env.SPACES_REGION,
        bucket: process.env.SPACES_BUCKET,
        folder: process.env.SPACES_FOLDER,
        endpoint: process.env.SPACES_ENDPOINT,
    },
    cors: {
        origins: process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
            : [],
    },
    frontend: {
        url: process.env.FRONTEND_URL,
    },
    aws: {
        ses: {
            region: process.env.AWS_SES_REGION,
            access_key: process.env.AWS_SES_ACCESS_KEY,
            secret_key: process.env.AWS_SES_SECRET_KEY,
        },
    },
    email: {
        restricted_domains: process.env.RESTRICTED_EMAIL_DOMAINS
            ? process.env.RESTRICTED_EMAIL_DOMAINS.split(',').map((o) =>
                  o.trim(),
              )
            : [],
    },
    smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASS || '',
        fromName: process.env.SMTP_FROM_NAME || 'jobsinc',
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        growthPriceId: process.env.STRIPE_GROWTH_PRICE_ID || '',
        businessPriceId: process.env.STRIPE_BUSINESS_PRICE_ID || '',
        whatsappAddonPriceId: process.env.STRIPE_WHATSAPP_ADDON_PRICE_ID || '',
    },
    integration: {
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY || '',
    },
    brevo: {
        api_key: process.env.BREVO_API_KEY,
        api: process.env.BREVO_API,
        email: process.env.BREVO_EMAIL,
    },
});
