export interface ProcessInterviewAudioMessage {
    recordingId: string;
    audioUrl: string;
    applicantInterviewId: string;
    metadata: {
        duration: number;
        mimeType: string;
        recordedAt: string;
    };
}

export interface TranscriptionCompleteMessage {
    recordingId: string;
    applicantInterviewId: string;
    success: boolean;
    errorMessage?: string;
    // Transcript data (only present when success is true)
    transcriptData?: {
        provider: string;
        providerJobId: string;
        languageCode: string;
        audioDuration: number;
        averageConfidence: number;
        speakerTurns: Array<{
            speaker: string;
            text: string;
        }>;
    };
}
