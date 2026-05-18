import { LinkedInPostVisibility } from '@app/common/enums/app.enums';
import { UploadedMedia } from '../../../../apps/core/src/job-posting/interface/linkedin.interface';

// ============================================
// Core App Jobs (Job Posting)
// ============================================

export interface JobMap {
    'linkedin-post-job': {
        text?: string;
        targetUrns: string[];
        visibility: LinkedInPostVisibility;
        media: UploadedMedia[];
        tenantId: string;
        jobId: string;
        timezone: string;
    };
}

export type JobName = keyof JobMap;

// ============================================
// AI App Jobs (LLM Processing)
// ============================================

export interface LlmMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMPayload {
    messages: LlmMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    response_format?: {
        type: 'text' | 'json_object';
    };
    metadata?: Record<string, any>;
}

export interface AIJobMap {
    chat: LLMPayload;
}

export type AIJobName = keyof AIJobMap;
