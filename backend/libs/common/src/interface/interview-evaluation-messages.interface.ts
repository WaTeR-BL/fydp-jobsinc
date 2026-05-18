import { Types } from 'mongoose';

/**
 * Message sent from Core to AI service to trigger interview evaluation
 */
export interface EvaluateInterviewMessage {
    transcriptId: string;
    applicantInterviewId: string;
    jobId: string;
    // Snapshot of enabled checklists at evaluation time (denormalized)
    checkLists: Array<{
        _id: Types.ObjectId;
        criterion: string;
        category: string;
        scoring: {
            min: number;
            max: number;
            anchors: Record<number, string>;
        };
    }>;
    // The actual transcript to evaluate
    transcript: {
        speakerTurns: Array<{
            speaker: string; // 'Interviewer' | 'Candidate'
            text: string;
        }>;
        averageConfidence: number;
    };
}

/**
 * Message sent from AI to Core when evaluation is complete
 */
export interface EvaluationCompleteMessage {
    transcriptId: string;
    applicantInterviewId: string;
    jobId: string;
    success: boolean;
    errorMessage?: string;
    // Evaluation data (only present when success is true)
    evaluationData?: {
        results: Array<{
            checklistId: string;
            criterion: string; // Snapshot
            category: string; // Snapshot
            score: number;
            justification: string;
            evidence: string[]; // Relevant quotes from transcript
            confidence: number; // AI confidence 0-1
        }>;
        overallSummary?: string;
        recommendation?: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';
        averageScore: number;
        averageConfidence: number;
        model: string; // e.g., 'llama-3.1-8b-instant + llama-3.3-70b-versatile'
        processingTimeMs: number;
    };
}

/**
 * Internal job data for Stage 1: Extract relevant transcript sections
 * One job per checklist item (processed in parallel via BullMQ)
 */
export interface ExtractRelevantTranscriptJob {
    evaluationId: string; // Unique ID for this evaluation session
    transcriptId: string;
    applicantInterviewId: string;
    jobId: string;
    checklistItem: {
        _id: string;
        criterion: string;
        category: string;
        scoring: {
            min: number;
            max: number;
            anchors: Record<number, string>;
        };
    };
    transcript: {
        speakerTurns: Array<{ speaker: string; text: string }>;
    };
}

/**
 * Output from Stage 1: Extracted relevant sections for a criterion
 */
export interface ExtractedTranscript {
    evaluationId: string;
    checklistId: string;
    relevantSections: Array<{
        speaker: string; // 'Interviewer' | 'Candidate'
        text: string;
        relevanceReason: string; // Why this section is relevant
    }>;
    totalSections: number; // How many sections were extracted
}

/**
 * Internal job data for Stage 2: Score the criterion with extracted context
 * Triggered when Stage 1 completes
 */
export interface ScoreCriterionJob {
    evaluationId: string;
    transcriptId: string;
    applicantInterviewId: string;
    jobId: string;
    checklistItem: {
        _id: string;
        criterion: string;
        category: string;
        scoring: {
            min: number;
            max: number;
            anchors: Record<number, string>;
        };
    };
    extractedTranscript: ExtractedTranscript;
}

/**
 * Output from Stage 2: Final score for a criterion
 */
export interface CriterionScore {
    evaluationId: string;
    checklistId: string;
    criterion: string;
    category: string;
    score: number;
    justification: string;
    evidence: string[]; // Direct quotes from extracted sections
    confidence: number; // 0-1, AI's confidence in this score
}
