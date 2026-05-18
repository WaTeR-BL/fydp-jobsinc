export const RMQ_CONSTANTS = {
    AI: {
        name: 'ai_queue',
        listensTo: {
            analyze: 'analyze-cv',
            extract_details: 'cv-extract-query',
            extract_skills: 'cv-extract-skills',
            chat_query: 'chat_query',
            embed_jobs: 'embed-jobs',
            match_cv_to_jobs: 'match-cv-to-jobs',
            embed_tenant_pdf: 'embed-tenant-pdf',
            delete_jobsinc_knowledge: 'delete-jobsinc-knowledge',
            process_interview_audio: 'process-interview-audio',
            evaluate_interview: 'evaluate-interview',
            extract_metrics: 'extract-metrics',
            generate_linkedin_post: 'generate-linkedin-post',
        },
    },
    BOT: {
        name: 'bot_queue',
        listensTo: {
            applicant_status: 'applicant-status',
            interview_status: 'interview_status',
        },
    },
    CORE: {
        name: 'core_queue',
        listensTo: {
            score_cv: 'score-cv',
            analyze_status: 'analyze-status',
            transcription_complete: 'transcription-complete',
            evaluation_complete: 'evaluation-complete',
        },
    },
    AGGREGATOR: {
        name: 'aggregator_queue',
        listensTo: { aggregate: 'scrape_jobs' },
    },
};

export const BMQ_CONSTANTS = {
    AI: {
        GROQ_QUEUE: 'groq-queue',
        // Interview evaluation internal queues (BullMQ)
        INTERVIEW_EVAL: {
            EXTRACT_QUEUE: 'interview-extract-queue', // Stage 1: Extract relevant sections
            SCORE_QUEUE: 'interview-score-queue', // Stage 2: Score criteria
        },
    },
    CORE: {
        MAIL_PROCESSING: 'mail-processing-queue',
    },
};
