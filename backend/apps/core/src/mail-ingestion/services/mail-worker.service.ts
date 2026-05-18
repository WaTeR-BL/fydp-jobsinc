import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Job } from 'bullmq';
import { ClientProxy } from '@nestjs/microservices';
import { BaseWorkerService } from '@app/common/queue/service/base-worker.service';
import {
    BMQ_CONSTANTS,
    RMQ_CONSTANTS,
} from '@app/common/queue-constants/constants';
import { Job as JobSchema, JobDocument } from '@app/common/schemas/job.schema';
import {
    ApplicantJobFeedback,
    ApplicantJobFeedbackDocument,
} from '@app/common/schemas/applicant-job-feedback.schema';
import {
    Applicant,
    ApplicantDocument,
} from '@app/common/schemas/applicant.schema';
import {
    ApplicationChannel,
    ApplicationSource,
    ApplicantJobStatus,
    JobStatus,
} from '@app/common/enums/app.enums';
import { MediaManagerService } from '@app/common/media-manager/media-manager.service';
import { SubscriptionGuardService } from '../../billing/subscription-guard.service';
import { MailJobPayload } from '../interfaces/mail-job.interface';
import { RawEmailAttachment } from '../interfaces/mail-connector.interface';
import { AnalysisPayloadInterface } from '@app/common/interface/ai-analysis-payload.interface';
import { Tenant } from '@app/common';
import { JobService } from '../../job/job.service';

@Injectable()
export class MailWorkerService extends BaseWorkerService<MailJobPayload> {
    protected queueName = BMQ_CONSTANTS.CORE.MAIL_PROCESSING;
    protected concurrency = 2;

    protected readonly logger = new Logger(MailWorkerService.name);

    constructor(
        @InjectModel(JobSchema.name)
        private readonly jobModel: Model<JobDocument>,
        @InjectModel(ApplicantJobFeedback.name)
        private readonly feedbackModel: Model<ApplicantJobFeedbackDocument>,
        @InjectModel(Tenant.name)
        private readonly tenantModel: Model<Tenant>,
        @InjectModel(Applicant.name)
        private readonly applicantModel: Model<ApplicantDocument>,
        @InjectConnection() private readonly connection: Connection,
        private readonly mediaManager: MediaManagerService,
        private readonly jobService: JobService,
        private readonly subscriptionGuard: SubscriptionGuardService,
        @Inject(RMQ_CONSTANTS.AI.name)
        private readonly aiClient: ClientProxy,
    ) {
        super();
    }

    async process(job: Job<MailJobPayload>): Promise<void> {
        const { tenantId, email } = job.data;

        const jobCode = this.extractJobCode(email);
        if (!jobCode) {
            this.logger.log(
                `Discarding uid=${email.uid}: no job code in To/Subject/body`,
            );
            return;
        }

        const jobDoc = await this.jobModel
            .findOne({
                jobVerificationCode: jobCode,
                tenantId: new Types.ObjectId(tenantId),
                jobStatus: JobStatus.OPEN,
                isDeleted: false,
            })
            .lean();

        if (!jobDoc) {
            this.logger.log(
                `Discarding uid=${email.uid}: no open job for code "${jobCode}"`,
            );
            return;
        }

        const acceptsEmail =
            !jobDoc.applicationChannels ||
            jobDoc.applicationChannels.includes(ApplicationChannel.EMAIL);

        if (!acceptsEmail) {
            this.logger.log(
                `Discarding uid=${email.uid}: job "${jobCode}" does not accept email applications`,
            );
            return;
        }

        const pdfAttachment = this.extractPdf(email.attachments);
        if (!pdfAttachment) {
            this.logger.log(
                `Discarding uid=${email.uid}: no valid PDF attachment`,
            );
            return;
        }

        const senderEmail = email.from.toLowerCase().trim();
        if (!senderEmail || !senderEmail.includes('@')) {
            this.logger.log(
                `Discarding uid=${email.uid}: cannot parse sender email`,
            );
            return;
        }

        const existing = await this.feedbackModel
            .findOne({ email: senderEmail, jobId: jobDoc._id })
            .lean();

        if (existing) {
            const isWhatsapp =
                !existing.source ||
                existing.source === ApplicationSource.WHATSAPP;
            const isActiveEmail =
                existing.source === ApplicationSource.EMAIL &&
                existing.applicantStatus !== ApplicantJobStatus.REJECT;

            if (isWhatsapp) {
                this.logger.log(
                    `Discarding uid=${email.uid}: ${senderEmail} already applied via WhatsApp for job ${jobCode}`,
                );
                return;
            }
            if (isActiveEmail) {
                this.logger.log(
                    `Discarding uid=${email.uid}: duplicate email application from ${senderEmail}`,
                );
                return;
            }
        }

        const pdfBuffer = Buffer.from(pdfAttachment.contentBase64, 'base64');
        const fileName = pdfAttachment.filename.endsWith('.pdf')
            ? pdfAttachment.filename
            : `cv-${Date.now()}.pdf`;

        const uploadResult = await this.mediaManager.uploadBuffer(
            pdfBuffer,
            fileName,
            'application/pdf',
        );
        if (!uploadResult.fileData) {
            throw new Error(`Failed to upload CV: ${uploadResult.message}`);
        }
        const uploaded = uploadResult.fileData;

        let feedbackId: string;
        const session = await this.connection.startSession();

        try {
            await session.withTransaction(async () => {
                let applicantId: string;
                const existingApplicant = await this.applicantModel
                    .findOne({ email: senderEmail })
                    .session(session)
                    .lean();

                if (existingApplicant) {
                    applicantId = existingApplicant._id.toString();
                } else {
                    const fullName = this.parseDisplayName(
                        email.fromName,
                        senderEmail,
                    );
                    const created = await this.applicantModel.create(
                        [{ email: senderEmail, fullName }],
                        { session },
                    );
                    applicantId = created[0]._id.toString();
                }

                const feedback = await this.feedbackModel.create(
                    [
                        {
                            applicantId: new Types.ObjectId(applicantId),
                            email: senderEmail,
                            jobId: jobDoc._id,
                            tenantId: new Types.ObjectId(tenantId),
                            cvUrl: uploaded.url,
                            applicantStatus: ApplicantJobStatus.PENDING,
                            source: ApplicationSource.EMAIL,
                        },
                    ],
                    { session },
                );
                feedbackId = feedback[0]._id.toString();
            });
        } catch (err) {
            this.logger.error(
                `Transaction failed for uid=${email.uid}: ${err.message}`,
            );
            throw err;
        } finally {
            await session.endSession();
        }

        const { allowed, reason } =
            await this.subscriptionGuard.canUseCvAnalysis(tenantId);
        if (!allowed) {
            this.logger.warn(
                `CV analysis blocked for tenant ${tenantId}: ${reason}`,
            );
            return;
        }

        const tenantDoc = await this.tenantModel
            .findById(new Types.ObjectId(tenantId))
            .lean();

        const [, ok3, metric] = await this.jobService.getJobMetric(
            jobDoc._id.toString(),
        );

        if (!ok3) return;

        const analysisPayload: AnalysisPayloadInterface = {
            jobApplicantId: feedbackId,
            cvUrl: uploaded.url,
            jobMetric: metric,
            tenantBusinessId: tenantDoc.businessId,
            tenantLiveContact: tenantDoc.liveContact,
        };

        this.aiClient.emit(RMQ_CONSTANTS.AI.listensTo.analyze, analysisPayload);
        await this.subscriptionGuard.recordCvUsage(tenantId);

        this.logger.log(
            `Email uid=${email.uid} processed — applicant ${senderEmail} queued for analysis (feedback=${feedbackId})`,
        );
    }

    private extractJobCode(email: MailJobPayload['email']): string | null {
        const tagFromTo = this.extractPlusTag(email.toFull);
        if (tagFromTo) return tagFromTo;

        if (email.deliveredTo) {
            const tagFromDelivered = this.extractPlusTag(email.deliveredTo);
            if (tagFromDelivered) return tagFromDelivered;
        }

        const subjectMatch = email.subject?.match(/REF[:\s]+([A-Z0-9_-]+)/i);
        if (subjectMatch) return subjectMatch[1];

        if (email.textBody) {
            const bodyMatch = email.textBody
                .slice(0, 200)
                .match(/REF[:\s]+([A-Z0-9_-]+)/i);
            if (bodyMatch) return bodyMatch[1];
        }

        return null;
    }

    private extractPlusTag(address: string): string | null {
        if (!address || typeof address !== 'string') return null;
        const match = address.match(/[^+<\s]+\+([^@\s>]+)@/);
        return match ? match[1] : null;
    }

    private extractPdf(
        attachments: RawEmailAttachment[],
    ): RawEmailAttachment | null {
        const pdfs = attachments.filter((a) => {
            const isPdfExt = a.filename.toLowerCase().endsWith('.pdf');
            const isPdfMime = a.contentType
                .toLowerCase()
                .includes('application/pdf');
            const validSize = a.size >= 10_000 && a.size <= 10_000_000;
            return (isPdfExt || isPdfMime) && validSize;
        });

        if (pdfs.length === 0) return null;
        return pdfs.sort((a, b) => b.size - a.size)[0];
    }

    private parseDisplayName(fromName: string, email: string): string {
        if (fromName && fromName.trim()) return fromName.trim();
        const local = email.split('@')[0] ?? email;
        return local
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }
}
