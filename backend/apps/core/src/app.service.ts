import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionGuardService } from './billing/subscription-guard.service';
import { ApplicantInterface } from '@app/common/interface/applicant.interface';
import { ClientProxy } from '@nestjs/microservices';
import { ApplicantService } from './applicant/applicant.service';
import { CreateApplicantDto } from './applicant/dto/applicant.dto';
import { JobService } from './job/job.service';
import { AnalysisPayloadInterface } from '@app/common/interface/ai-analysis-payload.interface';
import { ApplicantStatusInterface } from '@app/common/interface/applicant-status.interface';
import { ApplicantJobFeedbackService } from './applicant-job-feedback/applicant-job-feedback.service';
import { CreateApplicantJobFeedbackDto } from './applicant-job-feedback/dto/applicant-job-feedback.dto';
import { RMQ_CONSTANTS } from '@app/common/queue-constants/constants';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { TranscriptionCompleteMessage } from '@app/common/interface/interview-messages.interface';
import {
    EvaluateInterviewMessage,
    EvaluationCompleteMessage,
} from '@app/common/interface/interview-evaluation-messages.interface';
import { InterviewRecordingService } from './interview-recording/interview-recording.service';
import {
    ApplicantInterview,
    ApplicantInterviewDocument,
} from '@app/common/schemas/applicant-interview.schema';
import {
    InterviewTranscript,
    InterviewTranscriptDocument,
} from '@app/common/schemas/interview-transcript.schema';
import {
    InterviewEvaluation,
    InterviewEvaluationDocument,
} from '@app/common/schemas/interview-evaluation.schema';
import { InterviewStatus } from '@app/common/enums/app.enums';

@Injectable()
export class AppService {
    constructor(
        @Inject(RMQ_CONSTANTS.BOT.name) private readonly botClient: ClientProxy,
        private readonly applicantService: ApplicantService,
        @Inject(RMQ_CONSTANTS.AI.name) private readonly aiClient: ClientProxy,
        private readonly jobService: JobService,
        private readonly applicantJobFeedbackService: ApplicantJobFeedbackService,
        private readonly interviewRecordingService: InterviewRecordingService,
        @InjectConnection() private readonly connection: Connection,
        @InjectModel(ApplicantInterview.name)
        private readonly applicantInterviewModel: Model<ApplicantInterviewDocument>,
        @InjectModel(InterviewTranscript.name)
        private readonly transcriptModel: Model<InterviewTranscriptDocument>,
        @InjectModel(InterviewEvaluation.name)
        private readonly evaluationModel: Model<InterviewEvaluationDocument>,
        private readonly subscriptionGuardService: SubscriptionGuardService,
    ) {}

    async ScoreCV(payload: ApplicantInterface) {
        const session = await this.connection.startSession();
        try {
            await session.withTransaction(async () => {
                let applicantId: string = null;
                const [msg, ok, applicant] =
                    await this.applicantService.getByEmail(payload.email);

                if (!ok) throw new Error(msg);

                applicantId = applicant;

                if (!applicant) {
                    const applicantPayload: CreateApplicantDto = {
                        email: payload.email,
                        fullName: payload.fullName,
                        contact: payload.contactNo,
                        timezone: payload.timezone,
                    };

                    const [msg1, ok1, id] = await this.applicantService.create(
                        applicantPayload,
                        session,
                    );

                    if (!ok1) throw new Error(msg1);

                    applicantId = id;
                }

                const pl: CreateApplicantJobFeedbackDto = {
                    applicantId: applicantId,
                    jobId: payload.jobId,
                    email: payload.email,
                    cvUrl: payload.cvUrl,
                    video: payload.videoPath,
                    tenantId: payload.tenantId,
                    source: payload.source,
                };

                const [msg2, ok2, applicantFeedbackId] =
                    await this.applicantJobFeedbackService.create(pl, session);

                if (!ok2) throw new Error(msg2);

                const [msg3, ok3, metric] = await this.jobService.getJobMetric(
                    payload.jobId,
                );

                if (!ok3) throw new Error(msg3);

                const rec: AnalysisPayloadInterface = {
                    contact: payload.contactNo,
                    jobApplicantId: applicantFeedbackId,
                    cvUrl: payload.cvUrl,
                    jobMetric: metric,
                    tenantBusinessId: payload.tenantBusinessId,
                    tenantLiveContact: payload.tenantLiveContact,
                };

                const { allowed, reason } =
                    await this.subscriptionGuardService.canUseCvAnalysis(
                        payload.tenantId,
                    );
                if (!allowed)
                    throw new Error(reason ?? 'CV analysis limit reached');

                this.aiClient.emit(RMQ_CONSTANTS.AI.listensTo.analyze, rec);
                await this.subscriptionGuardService.recordCvUsage(
                    payload.tenantId,
                );
            });
        } catch (err) {
            const error: ApplicantStatusInterface = {
                success: false,
                message: err.message,
                contact: payload.contactNo,
                tenantBusinessId: payload.tenantBusinessId,
                tenantLiveContact: payload.tenantLiveContact,
            };
            this.botClient.emit(
                RMQ_CONSTANTS.BOT.listensTo.applicant_status,
                error,
            );
        } finally {
            await session.endSession();
        }
    }

    async AiErrorHandler(pl: ApplicantStatusInterface) {
        try {
            const [msg, ok] = await this.applicantJobFeedbackService.delete(
                pl.applicantJobId,
            );
            if (!ok) throw new Error(msg);

            this.botClient.emit(
                RMQ_CONSTANTS.BOT.listensTo.applicant_status,
                pl,
            );
        } catch (err) {
            console.log(err);
        }
    }

    async AiSuccessHandler(pl: ApplicantStatusInterface) {
        try {
            const [msg, ok] =
                await this.applicantJobFeedbackService.updateFeedback(
                    pl.applicantJobId,
                    pl.feedback,
                );
            if (!ok) throw new Error(msg);
            const status: ApplicantStatusInterface = {
                message: pl.message,
                success: pl.success,
                contact: pl.contact,
                tenantBusinessId: pl.tenantBusinessId,
                tenantLiveContact: pl.tenantLiveContact,
            };
            this.botClient.emit(
                RMQ_CONSTANTS.BOT.listensTo.applicant_status,
                status,
            );
        } catch (err) {
            console.log(err);
        }
    }

    async handleTranscriptionComplete(
        message: TranscriptionCompleteMessage,
    ): Promise<void> {
        console.log('📨 Transcription complete event received:', message);

        if (message.success && message.transcriptData) {
            // 1. Save transcript to database
            const transcript = await this.transcriptModel.create({
                interviewRecordingId: message.recordingId,
                provider: message.transcriptData.provider,
                providerJobId: message.transcriptData.providerJobId,
                languageCode: message.transcriptData.languageCode,
                audioDuration: message.transcriptData.audioDuration,
                averageConfidence: message.transcriptData.averageConfidence,
                speakerTurns: message.transcriptData.speakerTurns,
            });

            console.log('✅ Transcript saved to database:', transcript._id);

            // 2. Update recording status to completed
            await this.interviewRecordingService.updateRecordingStatus(
                message.recordingId,
                'completed',
            );

            // 3. Mark interview as completed
            await this.applicantInterviewModel.findByIdAndUpdate(
                message.applicantInterviewId,
                { isCompleted: true, status: InterviewStatus.COMPLETED },
            );

            console.log('✅ Interview marked as completed');

            // 4. Trigger interview evaluation
            await this.triggerInterviewEvaluation(
                transcript._id.toString(),
                message.applicantInterviewId,
                message.transcriptData,
            );
        } else {
            await this.interviewRecordingService.updateRecordingStatus(
                message.recordingId,
                'failed',
                message.errorMessage,
            );

            console.log('❌ Transcription failed:', message.errorMessage);
        }
    }

    /**
     * Trigger interview evaluation after transcript is saved
     * Uses roundCheckLists from the ApplicantInterview (snapshotted at scheduling time)
     */
    private async triggerInterviewEvaluation(
        transcriptId: string,
        applicantInterviewId: string,
        transcriptData: TranscriptionCompleteMessage['transcriptData'],
    ): Promise<void> {
        try {
            console.log(
                '🎯 Triggering interview evaluation for transcript:',
                transcriptId,
            );

            // 1. Get applicant interview with round checklists
            const applicantInterview = await this.applicantInterviewModel
                .findById(applicantInterviewId)
                .lean();

            if (!applicantInterview) {
                throw new Error(
                    `ApplicantInterview not found: ${applicantInterviewId}`,
                );
            }

            const jobId = applicantInterview.jobId;
            if (!jobId) {
                throw new Error('Job ID not found on ApplicantInterview');
            }

            // 2. Use round checklists snapshotted on the interview record
            const enabledChecklists = (
                applicantInterview.roundCheckLists || []
            ).filter((checklist) => checklist.enabled !== false);

            if (enabledChecklists.length === 0) {
                console.log(
                    '⚠️ No enabled checklists for this round:',
                    applicantInterview.roundName,
                );
                return;
            }

            console.log(
                `✅ Found ${enabledChecklists.length} enabled checklists for round "${applicantInterview.roundName}"`,
            );

            // 3. Prepare evaluation message
            const evaluationMessage: EvaluateInterviewMessage = {
                transcriptId,
                applicantInterviewId,
                jobId: jobId.toString(),
                checkLists: enabledChecklists.map((checklist) => ({
                    _id: checklist._id,
                    criterion: checklist.criterion,
                    category: checklist.category,
                    scoring: {
                        min: checklist.scoring.min,
                        max: checklist.scoring.max,
                        anchors: checklist.scoring.anchors,
                    },
                })),
                transcript: {
                    speakerTurns: transcriptData.speakerTurns,
                    averageConfidence: transcriptData.averageConfidence,
                },
            };

            // 5. Check evaluation quota before emitting
            const tenantId = applicantInterview.tenantId?.toString();
            const { allowed, reason } =
                await this.subscriptionGuardService.canUseEvaluation(tenantId);
            if (!allowed) {
                const blockedReason = reason ?? 'Evaluation quota exceeded';
                console.log(
                    `⚠️ Evaluation blocked for tenant ${tenantId}: ${blockedReason}`,
                );
                // Persist a failed evaluation record so the HR dashboard can
                // surface the reason and the retry endpoint can detect it.
                await this.evaluationModel.create({
                    transcriptId: transcriptId,
                    applicantInterviewId: applicantInterviewId,
                    jobId: jobId.toString(),
                    results: [],
                    status: 'failed',
                    errorMessage: `Evaluation blocked: ${blockedReason}`,
                });
                return;
            }

            // 6. Emit to AI service for evaluation
            this.aiClient.emit(
                RMQ_CONSTANTS.AI.listensTo.evaluate_interview,
                evaluationMessage,
            );
            await this.subscriptionGuardService.recordEvalBlockUsage(tenantId);

            console.log('✅ Evaluation request sent to AI service');
        } catch (error) {
            console.error('❌ Failed to trigger evaluation:', error.message);
            // Don't throw - evaluation failure shouldn't block transcription
        }
    }

    /**
     * Handle evaluation completion from AI service
     * Saves the evaluation results to database
     */
    async handleEvaluationComplete(
        message: EvaluationCompleteMessage,
    ): Promise<void> {
        console.log('📨 Evaluation complete event received:', message);

        try {
            if (message.success && message.evaluationData) {
                // Create evaluation record
                const evaluation = await this.evaluationModel.create({
                    transcriptId: message.transcriptId,
                    applicantInterviewId: message.applicantInterviewId,
                    jobId: message.jobId,
                    results: message.evaluationData.results.map((result) => ({
                        checklistId: result.checklistId,
                        criterion: result.criterion,
                        category: result.category,
                        score: result.score,
                        justification: result.justification,
                        evidence: result.evidence,
                        confidence: result.confidence,
                    })),
                    overallSummary: message.evaluationData.overallSummary,
                    recommendation: message.evaluationData.recommendation,
                    averageScore: message.evaluationData.averageScore,
                    averageConfidence: message.evaluationData.averageConfidence,
                    status: 'completed',
                    evaluatedAt: new Date(),
                    model: message.evaluationData.model,
                    processingTimeMs: message.evaluationData.processingTimeMs,
                });

                const applicantInterview = await this.applicantInterviewModel
                    .findById(message.applicantInterviewId)
                    .lean();

                if (applicantInterview) {
                    await this.applicantJobFeedbackService.updateInterviewCompletion(
                        applicantInterview.applicantJobFeedbackId.toString(),
                    );
                }

                console.log('✅ Evaluation saved to database:', evaluation._id);
                console.log(`   Recommendation: ${evaluation.recommendation}`);
                console.log(
                    `   Average Score: ${evaluation.averageScore.toFixed(2)}`,
                );
            } else {
                // Save failed evaluation record
                await this.evaluationModel.create({
                    transcriptId: message.transcriptId,
                    applicantInterviewId: message.applicantInterviewId,
                    jobId: message.jobId,
                    results: [],
                    status: 'failed',
                    errorMessage: message.errorMessage,
                });

                console.log('❌ Evaluation failed:', message.errorMessage);
            }
        } catch (error) {
            console.error('❌ Failed to save evaluation:', error.message);
        }
    }
}
