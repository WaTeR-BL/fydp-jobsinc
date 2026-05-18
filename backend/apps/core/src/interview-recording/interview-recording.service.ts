import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    InterviewRecording,
    InterviewRecordingDocument,
} from '@app/common/schemas/interview-recording.schema';
import { Job, JobDocument } from '@app/common/schemas/job.schema';
import {
    ApplicantInterview,
    ApplicantInterviewDocument,
} from '@app/common/schemas/applicant-interview.schema';
import { MediaManagerService } from '@app/common/media-manager/media-manager.service';
import { ClientProxy } from '@nestjs/microservices';
import { RMQ_CONSTANTS } from '@app/common/queue-constants/constants';
import { UploadInterviewDto } from './dto/upload-interview.dto';
import { ProcessInterviewAudioMessage } from '@app/common/interface/interview-messages.interface';

@Injectable()
export class InterviewRecordingService {
    constructor(
        @InjectModel(InterviewRecording.name)
        private interviewRecordingModel: Model<InterviewRecordingDocument>,
        @InjectModel(Job.name)
        private jobModel: Model<JobDocument>,
        @InjectModel(ApplicantInterview.name)
        private applicantInterviewModel: Model<ApplicantInterviewDocument>,
        private readonly mediaManager: MediaManagerService,
        @Inject(RMQ_CONSTANTS.AI.name)
        private readonly aiClient: ClientProxy,
    ) {}

    async validateJobVerificationCode(
        jobVerificationCode: string,
        interviewId?: string,
    ): Promise<[string, boolean, any]> {
        try {
            const job = await this.jobModel
                .findOne({ jobVerificationCode })
                .lean();

            if (!job) {
                return ['Invalid job url-verification code', false, null];
            }

            // If an interview ID is provided, check that the current round has checklists
            if (interviewId && Types.ObjectId.isValid(interviewId)) {
                const interview = await this.applicantInterviewModel
                    .findById(interviewId)
                    .lean();

                if (interview) {
                    const enabledChecklists = (
                        interview.roundCheckLists || []
                    ).filter((c) => c.enabled !== false);

                    if (enabledChecklists.length === 0) {
                        return [
                            'This interview round has no evaluation criteria configured. Recording is not available for this round.',
                            false,
                            null,
                        ];
                    }
                }
            }

            return [
                'Job url-verification code is valid',
                true,
                {
                    jobId: job._id,
                    jobTitle: job.title,
                },
            ];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async handleUpload(
        dto: UploadInterviewDto,
        file: Express.Multer.File,
    ): Promise<[string, boolean, any]> {
        try {
            // 1. Validate applicantInterviewId exists
            if (!Types.ObjectId.isValid(dto.applicantInterviewId)) {
                return ['Invalid applicant interview ID format', false, null];
            }

            const applicantInterview = await this.applicantInterviewModel
                .findById(dto.applicantInterviewId)
                .lean();

            if (!applicantInterview) {
                return ['Applicant interview not found', false, null];
            }

            console.log('✅ Applicant interview validated successfully');

            // 4. Validate file
            const allowedMimeTypes = [
                'audio/webm',
                'audio/wav',
                'audio/mp4',
                'audio/mpeg',
                'audio/mp3',
            ];
            if (!allowedMimeTypes.includes(file.mimetype)) {
                return [
                    'Invalid file type. Only audio files allowed.',
                    false,
                    null,
                ];
            }

            // Max size: 500MB
            if (file.size > 500 * 1024 * 1024) {
                return ['File too large. Max 500MB.', false, null];
            }

            // 5. Upload to S3
            const [uploadMsg, uploadSuccess, fileInfo] =
                await this.mediaManager.upload(file);
            if (!uploadSuccess) {
                return [uploadMsg, false, null];
            }

            console.log('✅ File uploaded to S3:', fileInfo.url);

            // 6. Create InterviewRecording document with applicantInterviewId
            const recording = await this.interviewRecordingModel.create({
                applicantInterviewId: dto.applicantInterviewId,
                audioUrl: fileInfo.url,
                filename: fileInfo.filename,
                fileSize: file.size,
                mimeType: file.mimetype,
                duration: dto.duration,
                recordedAt: dto.recordedAt || new Date(),
                status: 'queued',
                metadata: {
                    meetingUrl: dto.meetingUrl,
                    platform: 'google-meet',
                    uploadedBy: 'extension',
                },
            });

            console.log('✅ Interview recording created:', recording._id);

            // 7. Emit RabbitMQ message to AI service (non-blocking)
            const message: ProcessInterviewAudioMessage = {
                recordingId: recording._id.toString(),
                audioUrl: fileInfo.url,
                applicantInterviewId: dto.applicantInterviewId,
                metadata: {
                    duration: dto.duration,
                    mimeType: file.mimetype,
                    recordedAt: dto.recordedAt || new Date().toISOString(),
                },
            };

            this.aiClient.emit(
                RMQ_CONSTANTS.AI.listensTo.process_interview_audio,
                message,
            );

            console.log('✅ Message emitted to AI service');

            // 8. Return immediately (202 Accepted)
            return [
                'Recording uploaded and queued for processing',
                true,
                {
                    recordingId: recording._id,
                    status: recording.status,
                    audioUrl: recording.audioUrl,
                },
            ];
        } catch (error) {
            console.error('❌ Upload error:', error);
            return [error.message, false, null];
        }
    }

    async getRecording(id: string): Promise<[string, boolean, any]> {
        try {
            const recordings = await this.interviewRecordingModel.aggregate([
                { $match: { _id: new Types.ObjectId(id) } },
                {
                    $lookup: {
                        from: 'interviewTranscripts',
                        localField: '_id',
                        foreignField: 'interviewRecordingId',
                        as: 'transcript',
                    },
                },
                {
                    $unwind: {
                        path: '$transcript',
                        preserveNullAndEmptyArrays: true,
                    },
                },
            ]);

            if (!recordings.length) {
                return ['Recording not found', false, null];
            }

            return ['Success', true, recordings[0]];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async getRecordingsByInterview(
        applicantInterviewId: string,
    ): Promise<[string, boolean, any]> {
        try {
            const recordings = await this.interviewRecordingModel.aggregate([
                {
                    $match: {
                        applicantInterviewId: new Types.ObjectId(
                            applicantInterviewId,
                        ),
                    },
                },
                {
                    $lookup: {
                        from: 'interviewTranscripts',
                        localField: '_id',
                        foreignField: 'interviewRecordingId',
                        as: 'transcript',
                    },
                },
                {
                    $unwind: {
                        path: '$transcript',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                { $sort: { createdAt: -1 } },
            ]);

            return ['Success', true, recordings];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    // Called by RabbitMQ consumer when transcription completes
    async updateRecordingStatus(
        recordingId: string,
        status: 'completed' | 'failed',
        errorMessage?: string,
    ) {
        await this.interviewRecordingModel.findByIdAndUpdate(recordingId, {
            status,
            errorMessage: status === 'failed' ? errorMessage : undefined,
        });
    }
}
