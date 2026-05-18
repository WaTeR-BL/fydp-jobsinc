import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, {
    AggregatePaginateModel,
    ClientSession,
    Connection,
    Model,
    Types,
} from 'mongoose';
import {
    ApplicantInterview,
    ApplicantInterviewDocument,
} from '@app/common/schemas/applicant-interview.schema';
import {
    ApplicantJobFeedback,
    ApplicantJobFeedbackDocument,
} from '@app/common/schemas/applicant-job-feedback.schema';
import { Job, JobDocument } from '@app/common/schemas/job.schema';
import { Tenant } from '@app/common/schemas/tenant.schema';
import {
    InterviewEvaluation,
    InterviewEvaluationDocument,
} from '@app/common/schemas/interview-evaluation.schema';
import { GoogleCalendarService } from '../google-calender/google-calendar.service';
import { InterviewerService } from '../interviewer/interviewer.service';
import {
    ApplicantJobStatus,
    EmailTemplate,
    InterviewStatus,
    InterviewType,
    RoundOutcome,
} from '@app/common/enums/app.enums';
import {
    AssignInterviewerDto,
    CompleteInterviewDto,
    EventFilterDto,
    GetEventDetailDto,
    GetEventDto,
    InterviewDetailsDto,
    RejectCandidateDto,
    ScheduleInterviewDto,
    SkipRoundDto,
} from './dto/applicant-interviewer.dto';
import { InterviewHelperData } from './interface/interview.interface';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { CreateNotification } from '../notification/interface/notification.interface';
import { SendEmail } from '../email/interface/email.interface';
import { getEnumText } from '@app/common/enums/enum.helper';
import { toLocal, toUtc } from '../common/helper/timezone-handler.helper';
import { ApplicantJobFeedbackService } from '../applicant-job-feedback/applicant-job-feedback.service';
import { ApplicantService } from '../applicant/applicant.service';
import { randomBytes } from 'crypto';
import { RMQ_CONSTANTS } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApplicantInterviewStatusInterface } from '@app/common/interface/applicant-status.interface';
import { ConfigService } from '@nestjs/config';
import { SubscriptionGuardService } from '../billing/subscription-guard.service';
import { TimeSlotDto } from '../interviewer/dto/interviewer.dto';
import { IntegrationSyncService } from '../db-integration/services/integration-sync.service';
import {
    InterviewRecording,
    InterviewRecordingDocument,
} from '@app/common/schemas/interview-recording.schema';
import {
    InterviewTranscript,
    InterviewTranscriptDocument,
} from '@app/common/schemas/interview-transcript.schema';
import { EvaluateInterviewMessage } from '@app/common/interface/interview-evaluation-messages.interface';

@Injectable()
export class ApplicantInterviewerService {
    private readonly frontendUrl: string;
    constructor(
        @Inject(RMQ_CONSTANTS.BOT.name) private readonly botClient: ClientProxy,
        @InjectModel(ApplicantInterview.name)
        private readonly applicantInterviewerModel: AggregatePaginateModel<ApplicantInterviewDocument>,
        @InjectModel(ApplicantJobFeedback.name)
        private readonly feedbackModel: Model<ApplicantJobFeedbackDocument>,
        @InjectModel(Job.name)
        private readonly jobModel: Model<JobDocument>,
        private readonly meetService: GoogleCalendarService,
        private readonly interviewerService: InterviewerService,
        private readonly emailService: EmailService,
        private readonly notificationService: NotificationService,
        private readonly applicantJobFeedbackService: ApplicantJobFeedbackService,
        private readonly applicantService: ApplicantService,
        private readonly config: ConfigService,
        private readonly subscriptionGuardService: SubscriptionGuardService,
        @InjectModel(Tenant.name)
        private readonly tenantModel: Model<Tenant>,
        @InjectModel(InterviewEvaluation.name)
        private readonly evaluationModel: Model<InterviewEvaluationDocument>,
        @InjectConnection() private readonly connection: Connection,
        private readonly integrationSyncService: IntegrationSyncService,
        @Inject(RMQ_CONSTANTS.AI.name) private readonly aiClient: ClientProxy,
        @InjectModel(InterviewRecording.name)
        private readonly interviewRecordingModel: Model<InterviewRecordingDocument>,
        @InjectModel(InterviewTranscript.name)
        private readonly interviewTranscriptModel: Model<InterviewTranscriptDocument>,
    ) {
        this.frontendUrl = this.config.get<string>('frontend.url');
    }

    private readonly logger = new Logger(ApplicantInterviewerService.name);

    async extractInterviewHelperData(
        id: string,
        tenantId: string,
        userId?: string,
    ): Promise<[string, boolean, InterviewHelperData | null]> {
        try {
            const [data] = await this.applicantInterviewerModel.aggregate([
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(id),
                        tenantId: new mongoose.Types.ObjectId(tenantId),
                    },
                },
                {
                    $lookup: {
                        from: 'applicantJobFeedbacks',
                        let: { jfId: '$applicantJobFeedbackId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$jfId'] } } },
                            {
                                $lookup: {
                                    from: 'applicants',
                                    let: { aId: '$applicantId' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$aId'],
                                                },
                                            },
                                        },
                                        {
                                            $project: {
                                                email: 1,
                                                fullName: 1,
                                                contact: 1,
                                            },
                                        },
                                    ],
                                    as: 'applicantData',
                                },
                            },
                            {
                                $lookup: {
                                    from: 'jobs',
                                    let: { jId: '$jobId' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$jId'],
                                                },
                                            },
                                        },
                                        { $project: { title: 1 } },
                                    ],
                                    as: 'jobData',
                                },
                            },
                            {
                                $project: {
                                    applicantEmail: {
                                        $first: '$applicantData.email',
                                    },
                                    applicantName: {
                                        $first: '$applicantData.fullName',
                                    },
                                    applicantPhone: {
                                        $first: '$applicantData.contact',
                                    },
                                    jobTitle: { $first: '$jobData.title' },
                                },
                            },
                        ],
                        as: 'feedbackData',
                    },
                },
                {
                    $lookup: {
                        from: 'interviewers',
                        let: { iId: '$interviewerId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$iId'] } } },
                            {
                                $lookup: {
                                    from: 'users',
                                    let: { uId: '$userId' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$uId'],
                                                },
                                            },
                                        },
                                        { $project: { name: 1, timezone: 1 } },
                                    ],
                                    as: 'userData',
                                },
                            },
                            {
                                $project: {
                                    userId: 1,
                                    interviewerName: {
                                        $first: '$userData.name',
                                    },
                                    timezone: { $first: '$userData.timezone' },
                                },
                            },
                        ],
                        as: 'interviewerData',
                    },
                },
                {
                    $lookup: {
                        from: 'tenants',
                        let: { tId: '$tenantId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$tId'] } } },
                            {
                                $project: {
                                    name: 1,
                                    address: 1,
                                    sesMail: 1,
                                    logoUrl: 1,
                                    websiteUrl: 1,
                                    businessId: 1,
                                    contactEmail: 1,
                                },
                            },
                        ],
                        as: 'tenantData',
                    },
                },
                {
                    $lookup: {
                        from: 'credentialManager',
                        let: { tId: '$tenantId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$tenantId', '$$tId'] },
                                },
                            },
                            { $project: { googleCredentials: 1 } },
                        ],
                        as: 'credentials',
                    },
                },
                ...(userId
                    ? [
                          {
                              $lookup: {
                                  from: 'users',
                                  let: {
                                      uId: new mongoose.Types.ObjectId(userId),
                                  },
                                  pipeline: [
                                      {
                                          $match: {
                                              $expr: { $eq: ['$_id', '$$uId'] },
                                          },
                                      },
                                      { $project: { name: 1 } },
                                  ],
                                  as: 'assignedByData',
                              },
                          },
                      ]
                    : []),
                {
                    $project: {
                        _id: 0,
                        jobTitle: { $first: '$feedbackData.jobTitle' },
                        applicantEmail: {
                            $first: '$feedbackData.applicantEmail',
                        },
                        applicantName: {
                            $first: '$feedbackData.applicantName',
                        },
                        applicantPhone: {
                            $first: '$feedbackData.applicantPhone',
                        },
                        tenantBusinessId: { $first: '$tenantData.businessId' },
                        interviewerName: {
                            $first: '$interviewerData.interviewerName',
                        },
                        timezone: { $first: '$interviewerData.timezone' },
                        userId: { $first: '$interviewerData.userId' },
                        interviewerEmail: {
                            $first: {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: {
                                                $first: '$credentials.googleCredentials',
                                            },
                                            as: 'cred',
                                            cond: {
                                                $eq: [
                                                    '$$cred.userId',
                                                    {
                                                        $first: '$interviewerData.userId',
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                    as: 'cred',
                                    in: '$$cred.email',
                                },
                            },
                        },
                        tenant: { $first: '$tenantData.name' },
                        tenantAddress: { $first: '$tenantData.address' },
                        tenantSesEmail: { $first: '$tenantData.sesMail' },
                        websiteUrl: { $first: '$tenantData.websiteUrl' },
                        logoUrl: { $first: '$tenantData.logoUrl' },
                        contactEmail: { $first: '$tenantData.contactEmail' },
                        assignedBy: { $first: '$assignedByData.name' },
                    },
                },
                { $limit: 1 },
            ]);

            if (!data) {
                return ['No interview data found', false, null];
            }

            const required = [
                'applicantEmail',
                'applicantName',
                'jobTitle',
                'userId',
                'tenant',
                'tenantAddress',
                'logoUrl',
                'websiteUrl',
                'contactEmail',
                'interviewerEmail',
                'interviewerName',
                'tenantBusinessId',
            ];

            const missing = required.filter((k) => !data[k]);

            if (missing.length) {
                return [
                    `Missing required fields: ${missing.join(', ')}`,
                    false,
                    null,
                ];
            }

            return ['Interview data extracted successfully', true, data];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async assignInterviewer(
        dto: AssignInterviewerDto,
        tenantId: string,
        userId: string,
    ): Promise<[string, boolean]> {
        let session: ClientSession;
        try {
            session = await this.connection.startSession();
            session.startTransaction();

            const feedback = await this.feedbackModel
                .findById(dto.applicantJobFeedbackId)
                .select('jobId currentRound isRejected isHired')
                .session(session)
                .lean();

            if (!feedback) throw new Error('Applicant feedback not found');
            if (feedback.isRejected)
                throw new Error('Candidate has been rejected');
            if (feedback.isHired)
                throw new Error('Candidate has already been hired');

            const job = await this.jobModel
                .findById(feedback.jobId)
                .select('interviewPipeline')
                .session(session)
                .lean();

            if (!job || !job.interviewPipeline?.length) {
                throw new Error('Job has no interview pipeline configured');
            }

            const roundConfig = job.interviewPipeline.find(
                (r) => r.roundNumber === dto.roundNumber,
            );

            if (!roundConfig) {
                throw new Error(
                    `Round ${dto.roundNumber} does not exist in the pipeline`,
                );
            }

            const [msg, ok, inter] =
                await this.interviewerService.validateSlots(
                    dto.interviewerId,
                    tenantId,
                );

            if (!ok) throw new Error(msg);

            const currentPending =
                await this.applicantInterviewerModel.countDocuments({
                    interviewerId: dto.interviewerId,
                    status: InterviewStatus.PENDING,
                });

            const newCount = currentPending + 1;

            if (!inter.count) {
                throw new Error('Unknown Error');
            }

            if (inter.count < newCount) {
                throw new Error('Insufficient time slots defined');
            }

            const [msg1, ok1, applicantId] =
                await this.applicantJobFeedbackService.getApplicantId(
                    dto.applicantJobFeedbackId,
                );

            if (!ok1) throw new Error(msg1);

            const data = randomBytes(4).toString('hex');

            const [msg2, ok2] = await this.applicantService.createUser(
                applicantId,
                data,
                session,
            );

            if (!ok2) throw new Error(msg2);

            const existingInterview = await this.applicantInterviewerModel
                .findOne({
                    applicantJobFeedbackId: dto.applicantJobFeedbackId,
                    roundNumber: dto.roundNumber,
                    status: {
                        $in: [
                            InterviewStatus.PENDING,
                            InterviewStatus.SCHEDULED,
                            InterviewStatus.RESCHEDULED,
                        ],
                    },
                })
                .session(session)
                .lean();

            if (existingInterview) {
                throw new Error(
                    `Interview already assigned for round ${dto.roundNumber}`,
                );
            }

            if (
                dto.interviewType === InterviewType.ONSITE &&
                !dto.onsiteAddress
            ) {
                throw new Error(
                    'Onsite address is required for onsite interviews',
                );
            }

            const cancelledInterview = await this.applicantInterviewerModel
                .findOne({
                    applicantJobFeedbackId: dto.applicantJobFeedbackId,
                    roundNumber: dto.roundNumber,
                    status: InterviewStatus.CANCELLED,
                })
                .session(session);

            let interview: any;

            if (cancelledInterview) {
                cancelledInterview.interviewerId = new Types.ObjectId(
                    dto.interviewerId,
                );
                cancelledInterview.interviewType = dto.interviewType;
                cancelledInterview.status = InterviewStatus.PENDING;
                cancelledInterview.attendees = [];
                cancelledInterview.onsiteLocation = dto.onsiteLocation;
                cancelledInterview.onsiteAddress = dto.onsiteAddress;
                cancelledInterview.onsiteInstructions = dto.onsiteInstructions;
                cancelledInterview.notes = dto.notes;
                cancelledInterview.cancellationReason = undefined;
                cancelledInterview.cancelledAt = undefined;
                cancelledInterview.cancelledBy = undefined;
                cancelledInterview.roundCheckLists =
                    roundConfig.checkLists ?? [];
                await cancelledInterview.save({ session });
                interview = cancelledInterview;
            } else {
                interview = new this.applicantInterviewerModel({
                    applicantJobFeedbackId: dto.applicantJobFeedbackId,
                    jobId: feedback.jobId,
                    interviewerId: dto.interviewerId,
                    interviewType: dto.interviewType,
                    status: InterviewStatus.PENDING,
                    tenantId: tenantId,
                    attendees: [],
                    onsiteLocation: dto.onsiteLocation,
                    onsiteAddress: dto.onsiteAddress,
                    onsiteInstructions: dto.onsiteInstructions,
                    notes: dto.notes,
                    roundNumber: dto.roundNumber,
                    roundName: roundConfig.roundName,
                    roundCheckLists: roundConfig.checkLists ?? [],
                });

                await interview.save({ session });
            }

            await this.feedbackModel.updateOne(
                { _id: dto.applicantJobFeedbackId },
                {
                    $set: {
                        applicantStatus: ApplicantJobStatus.INTERVIEW,
                        currentRound: dto.roundNumber,
                    },
                },
                { session },
            );

            await session.commitTransaction();

            await this.interviewAssignmentNotification(
                interview._id.toString(),
                tenantId,
                userId,
            );

            const [, , rec] = await this.extractInterviewHelperData(
                interview._id.toString(),
                tenantId,
            );

            const email: SendEmail = {
                emailType: EmailTemplate.INTERVIEW_ASSIGNMENT,
                tenantId,
                fromName: rec.tenant,
                fromEmail: rec.tenantSesEmail,
                toEmail: rec.applicantEmail,
                applicantName: rec.applicantName,
                companyEmail: rec.contactEmail,
                logoUrl: rec.logoUrl,
                companyName: rec.tenant,
                jobTitle: rec.jobTitle,
                portalLink: `${this.frontendUrl}/applicant/login?email=${rec.applicantEmail}`,
            };

            await this.emailService.sendEmail(email);

            const payload: ApplicantInterviewStatusInterface = {
                applicantName: rec.applicantName,
                applicantPhone: rec.applicantPhone,
                tenantBusinessId: rec.tenantBusinessId,
                jobTitle: rec.jobTitle,
                applicantEmail: rec.applicantEmail,
                companyName: rec.tenant,
                link: `${this.frontendUrl}/applicant/login`,
            };

            const { allowed, isManaged } =
                await this.subscriptionGuardService.canUseWhatsapp(tenantId);
            if (allowed) {
                if (isManaged) {
                    this.botClient.emit(
                        RMQ_CONSTANTS.BOT.listensTo.interview_status,
                        payload,
                    );
                    await this.subscriptionGuardService.recordWhatsappMessageUsage(
                        tenantId,
                    );
                } else {
                    const tenant = await this.tenantModel
                        .findById(tenantId)
                        .select('whatsappAccessToken')
                        .lean();
                    if (tenant?.whatsappAccessToken) {
                        payload.tenantWhatsappAccessToken =
                            tenant.whatsappAccessToken;
                        this.botClient.emit(
                            RMQ_CONSTANTS.BOT.listensTo.interview_status,
                            payload,
                        );
                    }
                }
            }

            return ['Success', true];
        } catch (error) {
            if (session?.inTransaction()) {
                await session.abortTransaction();
            }
            return [error.message, false];
        } finally {
            await session?.endSession();
        }
    }

    async confirmSlot(dto: ScheduleInterviewDto): Promise<[string, boolean]> {
        const session = await this.connection.startSession();

        try {
            session.startTransaction();

            const interview = await this.applicantInterviewerModel.findOne(
                {
                    _id: dto.assignmentId,
                    status: InterviewStatus.PENDING,
                },
                null,
                { session },
            );

            if (!interview) {
                throw new Error(
                    'No pending interview found for this applicant',
                );
            }

            const [slotMsg, slotOk] =
                await this.interviewerService.updateTimeSlotSelection(
                    interview.interviewerId.toString(),
                    dto.timeSlotId,
                    session,
                );

            if (!slotOk) {
                throw new Error(slotMsg);
            }

            const updateResult = await this.applicantInterviewerModel.updateOne(
                {
                    _id: dto.assignmentId,
                    status: InterviewStatus.PENDING,
                },
                {
                    $set: {
                        status: InterviewStatus.CONFIRMATION,
                        timeSlotId: dto.timeSlotId,
                    },
                },
                { session },
            );

            if (updateResult.modifiedCount === 0) {
                throw new Error(
                    'Interview already processed by another request',
                );
            }

            await session.commitTransaction();

            return ['Success', true];
        } catch (error) {
            await session.abortTransaction();
            return [error.message, false];
        } finally {
            await session.endSession();
        }
    }

    private async finalizeInterview(
        interview: any,
        data: any,
        selectedTimeSlotId: string,
        isTimeSlotChanged: boolean,
    ): Promise<[string, boolean]> {
        const session = await this.connection.startSession();
        let timeSlot: TimeSlotDto;
        let interviewerData: any;
        let meetPayload: any = {};

        try {
            session.startTransaction();

            // 1. Fetch interviewer and locate the chosen time slot
            const [msg, ok, interviewer] =
                await this.interviewerService.getById(
                    interview.interviewerId.toString(),
                    interview.tenantId.toString(),
                    session,
                );
            if (!ok || !interviewer) throw new Error(msg);
            interviewerData = interviewer;

            timeSlot = interviewer.timeSlots.find(
                (s) =>
                    s.timeSlotId === selectedTimeSlotId &&
                    s.reserved === isTimeSlotChanged,
            );
            if (!timeSlot) throw new Error('Time slot not found');

            const startUtc = toUtc(timeSlot.startTime, data.timezone);
            const endUtc = toUtc(timeSlot.endTime, data.timezone);

            // 2. Write SCHEDULED status + times (still uncommitted)
            await this.applicantInterviewerModel.updateOne(
                { _id: interview._id },
                {
                    $set: {
                        timeSlotId: selectedTimeSlotId,
                        scheduledAt: startUtc,
                        scheduledEndTime: endUtc,
                        attendees: [data.applicantEmail, data.interviewerEmail],
                        status: InterviewStatus.SCHEDULED,
                        duration: Math.round(
                            (endUtc.getTime() - startUtc.getTime()) / 60000,
                        ),
                    },
                },
                { session },
            );

            // 3. Create Google Meet (ONLINE only).
            //    Runs inside the transaction — if this throws, abortTransaction
            //    in the catch block rolls back the SCHEDULED status write above.
            if (interview.interviewType === InterviewType.ONLINE) {
                const [meetMsg, meetOk, meetData] =
                    await this.meetService.createMeetEvent({
                        tenantId: interview.tenantId.toString(),
                        userId: interviewerData.userId.toString(),
                        timeSlotId: selectedTimeSlotId,
                        startTime: timeSlot.startTime,
                        endTime: timeSlot.endTime,
                        summary: `Interview: ${data.jobTitle}`,
                        description: `Interview for ${data.jobTitle}`,
                        applicantName: data.applicantName,
                        applicantEmail: data.applicantEmail,
                        timeZone: data.timezone,
                        interviewerName: data.interviewerName,
                        interviewerEmail: data.interviewerEmail,
                        applicantJobFeedbackId:
                            interview.applicantJobFeedbackId.toString(),
                    });

                if (!meetOk || !meetData) {
                    throw new Error(`Meet creation failed: ${meetMsg}`);
                }

                meetPayload = {
                    meetId: meetData.meetId,
                    meetLink: meetData.link,
                    hangoutLink: meetData.hangoutLink,
                    isSlotChanged: isTimeSlotChanged,
                };

                // 4. Persist meet details inside the same transaction
                await this.applicantInterviewerModel.updateOne(
                    { _id: interview._id },
                    { $set: meetPayload },
                    { session },
                );
            }

            await session.commitTransaction();

            await this.emailService.sendEmail({
                tenantId: interview.tenantId.toString(),
                fromEmail: data.tenantSesEmail,
                fromName: data.tenant,
                emailType: EmailTemplate.INTERVIEW,
                interviewType: interview.interviewType,
                toEmail: data.applicantEmail,
                applicantName: data.applicantName,
                jobTitle: data.jobTitle,
                interviewDate: timeSlot.startTime.substring(0, 10),
                interviewTime: timeSlot.startTime.substring(11, 16),
                interviewLocation:
                    interview.onsiteAddress ?? data.tenantAddress,
                meetingLink: meetPayload?.hangoutLink ?? null,
                companyEmail: data.contactEmail,
                companyName: data.tenant,
                logoUrl: data.logoUrl,
                websiteUrl: data.websiteUrl,
                interviewerEmail: data.interviewerEmail,
            });

            return ['Success', true];
        } catch (error) {
            await session.abortTransaction();
            return [error.message, false];
        } finally {
            await session.endSession();
        }
    }

    async scheduleInterview(id: string): Promise<[string, boolean]> {
        const interview = await this.applicantInterviewerModel.findOne({
            _id: id,
            status: InterviewStatus.CONFIRMATION,
        });

        if (!interview) {
            return ['No confirmation status interview found', false];
        }

        const [msgE, okE, data] = await this.extractInterviewHelperData(
            interview._id.toString(),
            interview.tenantId.toString(),
        );

        if (!okE) return [msgE, false];

        return this.finalizeInterview(
            interview,
            data,
            interview.timeSlotId.toString(),
            false,
        );
    }

    async changeInterviewSlot(
        id: string,
        newTimeSlotId: string,
    ): Promise<[string, boolean]> {
        const interview = await this.applicantInterviewerModel.findOne({
            _id: id,
            status: InterviewStatus.CONFIRMATION,
        });

        if (!interview) {
            return ['No confirmation status interview found', false];
        }

        const [msgE, okE, data] = await this.extractInterviewHelperData(
            interview._id.toString(),
            interview.tenantId.toString(),
        );

        if (!okE) return [msgE, false];

        return this.finalizeInterview(interview, data, newTimeSlotId, true);
    }

    /*async rescheduleInterview(
        interviewId: string,
        tenantId: string,
        dto: RescheduleInterviewDto,
    ): Promise<[string, boolean, InterviewScheduleResponseDto | null]> {
        const session = await this.connection.startSession();

        try {
            const interview =
                await this.applicantInterviewerModel.findById(interviewId);

            if (!interview) {
                throw new Error('Interview not found');
            }

            if (interview.status === InterviewStatus.COMPLETED) {
                throw new Error('Cannot reschedule a completed interview');
            }

            if (interview.status === InterviewStatus.CANCELLED) {
                throw new Error('Cannot reschedule a cancelled interview');
            }

            const oldInterviewType = interview.interviewType;
            const oldTimeSlotId = interview.timeSlotId?.toString();

            const [, , interviewer] = await this.interviewerService.getById(
                interview.interviewerId.toString(),
                tenantId,
            );

            if (!interviewer) {
                throw new Error('Interviewer not found');
            }

            const newTimeSlot = interviewer.timeSlots.find(
                (slot) => slot.timeSlotId === dto.newTimeSlotId,
            );

            if (!newTimeSlot) {
                throw new Error('New time slot not found');
            }

            if (newTimeSlot.selected) {
                throw new Error('New time slot is not available');
            }

            if (
                dto.interviewType === InterviewType.ONSITE &&
                !dto.onsiteAddress
            ) {
                throw new Error(
                    'Onsite address is required for onsite interviews',
                );
            }

            let data: InterviewScheduleResponseDto | null = null;

            await session.withTransaction(async () => {
                if (oldTimeSlotId) {
                    await this.interviewerService.releaseTimeSlot(
                        interview.interviewerId.toString(),
                        oldTimeSlotId,
                        session,
                    );
                }

                const [slotMsg, slotOk] =
                    await this.interviewerService.updateTimeSlotSelection(
                        interview.interviewerId.toString(),
                        dto.newTimeSlotId,
                        session,
                    );

                if (!slotOk) {
                    throw new Error(`Time slot update failed: ${slotMsg}`);
                }

                interview.timeSlotId = new Types.ObjectId(dto.newTimeSlotId);
                interview.scheduledAt = new Date(newTimeSlot.startTime);
                interview.scheduledEndTime = new Date(newTimeSlot.endTime);
                interview.attendees = dto.emails;
                interview.interviewType = dto.interviewType;
                interview.status = InterviewStatus.RESCHEDULED;
                interview.rescheduleCount += 1;
                interview.notes = dto.notes || interview.notes;

                interview.onsiteLocation = dto.onsiteLocation;
                interview.onsiteAddress = dto.onsiteAddress;
                interview.onsiteInstructions = dto.onsiteInstructions;

                interview.duration = Math.round(
                    (new Date(newTimeSlot.endTime).getTime() -
                        new Date(newTimeSlot.startTime).getTime()) /
                        (1000 * 60),
                );

                await interview.save({ session });

                data = {
                    interviewId: interview._id.toString(),
                    interviewType: interview.interviewType,
                    scheduledAt: interview.scheduledAt,
                    scheduledEndTime: interview.scheduledEndTime,
                    meetLink: null,
                    onsiteLocation: interview.onsiteLocation,
                    onsiteAddress: interview.onsiteAddress,
                    emailSent: false,
                };
            });

            if (oldInterviewType === InterviewType.ONLINE && interview.meetId) {
                if (dto.interviewType === InterviewType.ONLINE) {
                    const [updateMsg, updateOk] =
                        await this.meetService.updateEvent(interview.meetId, {
                            tenantId: dto.tenantId,
                            startTime: newTimeSlot.startTime,
                            endTime: newTimeSlot.endTime,
                            emails: dto.emails,
                        });

                    if (!updateOk) {
                        return [updateMsg, updateOk, null];
                    }

                    data.meetLink = interview.meetLink;
                } else {
                    await this.meetService.deleteEvent(
                        interview.meetId,
                        dto.tenantId,
                    );
                    interview.meetId = null;
                    interview.meetLink = null;
                    interview.hangoutLink = null;
                }
            } else if (dto.interviewType === InterviewType.ONLINE) {
                const [meetMsg, meetOk, meetData] =
                    await this.meetService.createMeetEvent({
                        tenantId: dto.tenantId,
                        interviewerId: interview.userId.toString(),
                        timeSlotId: dto.newTimeSlotId,
                        applicantJobFeedbackId:
                            interview.applicantJobFeedbackId.toString(),
                        startTime: newTimeSlot.startTime,
                        endTime: newTimeSlot.endTime,
                        emails: dto.emails,
                        summary: 'Rescheduled Interview Call',
                        tenantEmail: '',
                        googleAuthorized: false,
                    });

                if (meetOk && meetData) {
                    interview.meetId = meetData.meetId;
                    interview.meetLink = meetData.link;
                    interview.hangoutLink = meetData.hangoutLink;
                    data.meetLink = meetData.link;
                } else {
                    return [meetMsg, false, null];
                }
            } else {
                /!*                const emailSent = await this.sendRescheduleEmail(
                    interview,
                    oldScheduledAt,
                    dto.reason,
                );
                interview.emailSent = emailSent;
                interview.emailSentAt = emailSent ? new Date() : null;
                data.emailSent = emailSent;*!/
            }

            await interview.save();

            return ['Success', true, data];
        } catch (error) {
            return [error.message, false, null];
        } finally {
            await session.endSession();
        }
    }
*/
    async completeInterview(
        interviewId: string,
        dto: CompleteInterviewDto,
    ): Promise<[string, boolean]> {
        try {
            const interview =
                await this.applicantInterviewerModel.findById(interviewId);

            if (!interview) {
                throw new Error('Interview not found');
            }

            if (interview.status === InterviewStatus.COMPLETED) {
                return ['Interview already completed', true];
            }

            if (interview.status === InterviewStatus.CANCELLED) {
                throw new Error('Cannot complete a cancelled interview');
            }

            if (dto.applicantAttended === false) {
                interview.status = InterviewStatus.NO_SHOW;
            } else {
                interview.status = InterviewStatus.COMPLETED;
            }

            interview.isCompleted = true;
            interview.completedAt = new Date();
            await interview.save();

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async getInterviewDetails(
        interviewId: string,
    ): Promise<[string, boolean, InterviewDetailsDto | null]> {
        try {
            const interview = await this.applicantInterviewerModel
                .findById(interviewId)
                .lean();

            if (!interview) {
                return ['Interview not found', false, null];
            }

            const details: InterviewDetailsDto = {
                id: interview._id.toString(),
                applicantJobFeedbackId:
                    interview.applicantJobFeedbackId.toString(),
                interviewerId: interview.interviewerId.toString(),
                interviewType: interview.interviewType,
                status: interview.status,
                scheduledAt: interview.scheduledAt,
                scheduledEndTime: interview.scheduledEndTime,
                attendees: interview.attendees,
                meetLink: interview.meetLink,
                onsiteLocation: interview.onsiteLocation,
                onsiteAddress: interview.onsiteAddress,
                duration: interview.duration,
                notes: interview.notes,
                rescheduleCount: interview.rescheduleCount,
                cancellationReason: interview.cancellationReason,
                cancelledAt: interview.cancelledAt,
                completedAt: interview.completedAt,
                isCompleted: interview.isCompleted,
                emailSent: interview.emailSent,
            };

            return ['Success', true, details];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    private async rollbackSchedule(
        interviewId: string,
        interviewerId: string,
        timeSlotId: string,
    ): Promise<void> {
        try {
            await this.interviewerService.releaseTimeSlot(
                interviewerId,
                timeSlotId,
            );
            await this.applicantInterviewerModel.updateOne(
                { _id: interviewId },
                { $set: { status: InterviewStatus.PENDING } },
            );
        } catch {}
    }

    /*    private async sendScheduleEmail(
        interview: ApplicantInterviewData,
    ): Promise<boolean> {
        try {
            const emailData = {
                applicantName: interview.applicantName,
                applicantEmail: interview.applicantEmail,
                interviewType: interview.interviewType,
                scheduledAt: interview.scheduledAt,
                scheduledEndTime: interview.scheduledEndTime,
                interviewerName: interview.interviewerName,
                location: interview.location,
                address: interview.address,
                instructions: interview.instructions,
                meetLink: interview.meetLink,
                companyName: interview.companyName,
            };

            const [, success] =
                await this.emailService.sendInterviewScheduledEmail(emailData);
            return success;
        } catch {
            return false;
        }
    }

    private async sendRescheduleEmail(
        interview: ApplicantInterviewData,
        oldScheduledAt: Date,
        reason?: string,
    ): Promise<boolean> {
        try {
            const emailData = {
                applicantName: 'Applicant',
                applicantEmail: interview.attendees[0],
                oldScheduledAt,
                newScheduledAt: interview.scheduledAt,
                newScheduledEndTime: interview.scheduledEndTime,
                interviewType: interview.interviewType,
                reason,
                location: interview.onsiteLocation,
                address: interview.onsiteAddress,
                meetLink: interview.meetLink,
                companyName: tenant?.name || 'Company',
            };

            const [, success] =
                await this.emailService.sendInterviewRescheduledEmail(emailData);
            return success;
        } catch (error) {
            return false;
        }
    }

    private async sendCancellationEmail(
        interview: ApplicantInterviewDocument,
        tenantId: string,
        reason: string,
    ): Promise<boolean> {
        try {
            const [, , tenant] = await this.tenantService.get(tenantId);

            const emailData = {
                applicantName: 'Applicant',
                applicantEmail: interview.attendees[0],
                scheduledAt: interview.scheduledAt,
                reason,
                companyName: tenant?.name || 'Company',
            };

            const [, success] =
                await this.emailService.sendInterviewCancelledEmail(emailData);
            return success;
        } catch (error) {
            return false;
        }
    }*/

    /*private async updateInterviewerStats(interviewerId: string): Promise<void> {
        try {
            const totalInterviews = await this.interviewModel.countDocuments({
                interviewerId,
                status: { $in: [InterviewStatus.COMPLETED, InterviewStatus.NO_SHOW] },
            });

            const completedInterviews = await this.interviewModel.countDocuments({
                interviewerId,
                status: InterviewStatus.COMPLETED,
            });

            const ratings = await this.interviewModel.aggregate([
                {
                    $match: {
                        interviewerId: new Types.ObjectId(interviewerId),
                        rating: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: '$rating' },
                    },
                },
            ]);

            // TODO: Implement updateStats method in InterviewerService
            // await this.interviewerService.updateStats(interviewerId, {
            //     totalInterviews,
            //     completedInterviews,
            //     averageRating,
            // });
        } catch {}
    }*/

    async getMeetingDetails(meetLink: string): Promise<[string, boolean, any]> {
        try {
            const cleanedLink = meetLink.split('?')[0];
            const validatedLink =
                await this.applicantInterviewerModel.aggregate([
                    {
                        $match: { hangoutLink: cleanedLink },
                    },
                    {
                        $project: {
                            interviewerId: 1,
                            tenantId: 1,
                            applicantJobFeedbackId: 1,
                            scheduledAt: 1,
                        },
                    },
                    {
                        $lookup: {
                            from: 'interviewers',
                            localField: 'interviewerId',
                            foreignField: '_id',
                            pipeline: [
                                { $project: { userId: 1 } },
                                {
                                    $lookup: {
                                        from: 'users',
                                        localField: 'userId',
                                        foreignField: '_id',
                                        pipeline: [
                                            { $project: { name: 1, _id: 0 } },
                                        ],
                                        as: 'user',
                                    },
                                },
                                { $unwind: '$user' },
                                { $project: { name: '$user.name', _id: 0 } },
                            ],
                            as: 'interviewer',
                        },
                    },
                    {
                        $lookup: {
                            from: 'tenants',
                            localField: 'tenantId',
                            foreignField: '_id',
                            pipeline: [{ $project: { name: 1, _id: 0 } }],
                            as: 'tenant',
                        },
                    },
                    {
                        $lookup: {
                            from: 'applicantJobFeedbacks',
                            localField: 'applicantJobFeedbackId',
                            foreignField: '_id',
                            pipeline: [
                                { $project: { applicantId: 1, jobId: 1 } },
                                {
                                    $lookup: {
                                        from: 'applicants',
                                        localField: 'applicantId',
                                        foreignField: '_id',
                                        pipeline: [
                                            {
                                                $project: {
                                                    fullName: 1,
                                                    _id: 0,
                                                },
                                            },
                                        ],
                                        as: 'applicant',
                                    },
                                },
                                {
                                    $lookup: {
                                        from: 'jobs',
                                        localField: 'jobId',
                                        foreignField: '_id',
                                        pipeline: [
                                            { $project: { title: 1, _id: 0 } },
                                        ],
                                        as: 'job',
                                    },
                                },
                                { $unwind: '$applicant' },
                                { $unwind: '$job' },
                                {
                                    $project: {
                                        applicantName: '$applicant.fullName',
                                        jobTitle: '$job.title',
                                        _id: 0,
                                    },
                                },
                            ],
                            as: 'jobFeedback',
                        },
                    },
                    { $unwind: '$interviewer' },
                    { $unwind: '$tenant' },
                    { $unwind: '$jobFeedback' },
                    {
                        $project: {
                            _id: 1,
                            companyName: '$tenant.name',
                            interviewerName: '$interviewer.name',
                            applicantName: '$jobFeedback.applicantName',
                            jobTitle: '$jobFeedback.jobTitle',
                            scheduledAt: 1,
                        },
                    },
                ]);

            if (!validatedLink || validatedLink.length === 0) {
                return ['Meeting not found', false, null];
            }

            return ['Meeting found', true, validatedLink];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async events(
        tenantId: string,
        dto: EventFilterDto,
        timezone: string,
        userId?: string,
    ): Promise<[string, boolean, GetEventDto[]]> {
        try {
            const match: Record<string, any> = {
                tenantId: new Types.ObjectId(tenantId),
            };

            if (dto.interviewType !== undefined) {
                match.interviewType = dto.interviewType;
            }

            if (dto.status !== undefined) {
                match.status = dto.status;
            }

            if (dto.from && dto.to) {
                match.$and = [
                    { scheduledAt: { $gte: toUtc(dto.from, timezone) } },
                    { scheduledEndTime: { $lte: toUtc(dto.to, timezone) } },
                ];
            } else if (dto.from) {
                match.scheduledAt = { $gte: toUtc(dto.from, timezone) };
            } else if (dto.to) {
                match.scheduledEndTime = { $lte: toUtc(dto.to, timezone) };
            }

            const pipeline: any[] = [
                { $match: match },
                ...(userId
                    ? [
                          {
                              $lookup: {
                                  from: 'interviewers',
                                  let: { interviewerId: '$interviewerId' },
                                  pipeline: [
                                      {
                                          $match: {
                                              $expr: {
                                                  $and: [
                                                      {
                                                          $eq: [
                                                              '$_id',
                                                              '$$interviewerId',
                                                          ],
                                                      },
                                                      {
                                                          $eq: [
                                                              '$userId',
                                                              new Types.ObjectId(
                                                                  userId,
                                                              ),
                                                          ],
                                                      },
                                                  ],
                                              },
                                          },
                                      },
                                      { $project: { _id: 1 } },
                                  ],
                                  as: 'interviewer',
                              },
                          },
                          {
                              $match: {
                                  interviewer: { $ne: [] },
                              },
                          },
                      ]
                    : []),
                {
                    $project: {
                        _id: 1,
                        interviewType: 1,
                        status: 1,
                        scheduledAt: 1,
                        scheduledEndTime: 1,
                    },
                },
            ];

            const agg = this.applicantInterviewerModel.aggregate(pipeline);

            const paginatedResult =
                await this.applicantInterviewerModel.aggregatePaginate(agg, {
                    useFacet: true,
                });

            const data: GetEventDto[] = paginatedResult.docs.map((inter) => ({
                id: inter._id.toString(),
                interviewType: getEnumText(inter.interviewType, InterviewType),
                status: getEnumText(inter.status, InterviewStatus),
                date: inter.scheduledAt
                    ? toLocal(inter.scheduledAt, timezone).slice(0, 10)
                    : null,
                startTime: inter.scheduledAt
                    ? toLocal(inter.scheduledAt, timezone).slice(11, 16)
                    : null,
                endTime: inter.scheduledEndTime
                    ? toLocal(inter.scheduledEndTime, timezone).slice(11, 16)
                    : null,
            }));

            return ['Success', true, data];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async eventDetail(
        id: string,
        timezone: string,
    ): Promise<[string, boolean, GetEventDetailDto]> {
        try {
            const data = await this.applicantInterviewerModel
                .aggregate([
                    {
                        $match: { _id: new Types.ObjectId(id) },
                    },

                    {
                        $lookup: {
                            from: 'applicantJobFeedbacks',
                            let: { jfId: '$applicantJobFeedbackId' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ['$_id', '$$jfId'] },
                                    },
                                },

                                {
                                    $lookup: {
                                        from: 'applicants',
                                        let: { aId: '$applicantId' },
                                        pipeline: [
                                            {
                                                $match: {
                                                    $expr: {
                                                        $eq: ['$_id', '$$aId'],
                                                    },
                                                },
                                            },
                                            { $project: { fullName: 1 } },
                                            { $limit: 1 },
                                        ],
                                        as: 'applicant',
                                    },
                                },

                                {
                                    $lookup: {
                                        from: 'jobs',
                                        let: { jId: '$jobId' },
                                        pipeline: [
                                            {
                                                $match: {
                                                    $expr: {
                                                        $eq: ['$_id', '$$jId'],
                                                    },
                                                },
                                            },
                                            { $project: { title: 1 } },
                                            { $limit: 1 },
                                        ],
                                        as: 'job',
                                    },
                                },

                                {
                                    $project: {
                                        applicantName: {
                                            $first: '$applicant.fullName',
                                        },
                                        jobTitle: { $first: '$job.title' },
                                    },
                                },
                                { $limit: 1 },
                            ],
                            as: 'job',
                        },
                    },

                    {
                        $lookup: {
                            from: 'tenants',
                            let: { tId: '$tenantId' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ['$_id', '$$tId'] },
                                    },
                                },
                                { $project: { address: 1 } },
                                { $limit: 1 },
                            ],
                            as: 'tenant',
                        },
                    },

                    // Lookup selected time slot from the interviewer for CONFIRMATION status
                    {
                        $lookup: {
                            from: 'interviewers',
                            let: {
                                iId: '$interviewerId',
                                tsId: '$timeSlotId',
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ['$_id', '$$iId'] },
                                    },
                                },
                                {
                                    $project: {
                                        matchedSlot: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: '$timeSlots',
                                                        as: 'slot',
                                                        cond: {
                                                            $eq: [
                                                                '$$slot._id',
                                                                '$$tsId',
                                                            ],
                                                        },
                                                    },
                                                },
                                                0,
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: 'interviewerSlot',
                        },
                    },

                    {
                        $project: {
                            _id: 0,
                            id: { $toString: '$_id' },
                            rawStatus: '$status',

                            date: {
                                $dateToString: {
                                    date: '$scheduledAt',
                                    format: '%Y-%m-%d',
                                    timezone,
                                },
                            },
                            startTime: {
                                $dateToString: {
                                    date: '$scheduledAt',
                                    format: '%H:%M',
                                    timezone,
                                },
                            },
                            endTime: {
                                $dateToString: {
                                    date: '$scheduledEndTime',
                                    format: '%H:%M',
                                    timezone,
                                },
                            },

                            status: 1,
                            interviewType: 1,
                            timeSlotId: { $toString: '$timeSlotId' },
                            feedbackId: {
                                $toString: '$applicantJobFeedbackId',
                            },
                            jobId: { $toString: '$jobId' },

                            // Raw slot times for CONFIRMATION status (scheduledAt is null)
                            slotStartTime: {
                                $first: '$interviewerSlot.matchedSlot.startTime',
                            },
                            slotEndTime: {
                                $first: '$interviewerSlot.matchedSlot.endTime',
                            },

                            applicantName: { $first: '$job.applicantName' },
                            jobTitle: { $first: '$job.jobTitle' },
                            meetLink: '$hangoutLink',

                            location: {
                                $cond: [
                                    { $eq: ['$interviewType', 0] },
                                    'Online',
                                    { $first: '$tenant.address' },
                                ],
                            },
                        },
                    },

                    { $limit: 1 },
                ])
                .exec();

            if (!data.length) return ['Event not found', false, null];

            const event = data[0];

            // For CONFIRMATION status (scheduledAt is null), populate times from the selected slot
            const slotDate = event.slotStartTime
                ? toLocal(event.slotStartTime, timezone).slice(0, 10)
                : null;
            const slotStart = event.slotStartTime
                ? toLocal(event.slotStartTime, timezone).slice(11, 16)
                : null;
            const slotEnd = event.slotEndTime
                ? toLocal(event.slotEndTime, timezone).slice(11, 16)
                : null;

            const formattedEvent = {
                id: event.id,
                date: event.date || slotDate,
                startTime: event.startTime || slotStart,
                endTime: event.endTime || slotEnd,
                status: getEnumText(event.status, InterviewStatus),
                interviewType: getEnumText(event.interviewType, InterviewType),
                applicantName: event.applicantName,
                jobTitle: event.jobTitle,
                meetLink: event.meetLink,
                location: event.location,
                timeSlotId: event.timeSlotId ?? null,
                feedbackId: event.feedbackId ?? null,
                jobId: event.jobId ?? null,
            };

            return ['Success', true, formattedEvent];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    private async interviewAssignmentNotification(
        applicantInterviewerId: string,
        tenantId: string,
        userId: string,
    ): Promise<void> {
        try {
            const [, , data] = await this.extractInterviewHelperData(
                applicantInterviewerId,
                tenantId,
                userId,
            );

            const title = 'New Interview Assigned';
            const message = `You have been assigned to interview ${data.applicantName} for the ${data.jobTitle} position by ${data.assignedBy}. Please confirm your time slots`;

            const body: CreateNotification = {
                tenantId: tenantId,
                userId: userId,
                title: title,
                message: message,
            };

            await this.notificationService.create(body);
        } catch {}
    }

    async advanceCandidate(
        feedbackId: string,
        userId: string,
    ): Promise<[string, boolean, any]> {
        try {
            const feedback = await this.feedbackModel.findById(feedbackId);
            if (!feedback) return ['Feedback not found', false, null];
            if (feedback.isRejected) {
                return ['Candidate has been rejected', false, null];
            }
            if (feedback.isHired) {
                return ['Candidate has already been hired', false, null];
            }

            const currentRound = feedback.currentRound;
            if (currentRound < 1) {
                return ['No round in progress to advance from', false, null];
            }

            const interview = await this.applicantInterviewerModel.findOne({
                applicantJobFeedbackId: feedbackId,
                roundNumber: currentRound,
                status: InterviewStatus.COMPLETED,
            });

            if (!interview) {
                return [
                    `No completed interview found for round ${currentRound}`,
                    false,
                    null,
                ];
            }

            if (interview.roundOutcome) {
                return [
                    `Round ${currentRound} outcome already decided`,
                    false,
                    null,
                ];
            }

            interview.roundOutcome = RoundOutcome.PASSED;
            interview.outcomeDecidedBy = new Types.ObjectId(userId);
            await interview.save();

            const job = await this.jobModel
                .findById(feedback.jobId)
                .select('interviewPipeline')
                .lean();

            const totalRounds = job?.interviewPipeline?.length ?? 0;
            const nextRound = currentRound + 1;

            feedback.totalRoundsCompleted += 1;
            feedback.completedRounds.push(currentRound);
            feedback.currentRound = nextRound;

            if (nextRound > totalRounds) {
                feedback.isProcessCompleted = true;
            }

            await feedback.save();

            const nextRoundConfig =
                nextRound <= totalRounds
                    ? job.interviewPipeline.find(
                          (r) => r.roundNumber === nextRound,
                      )
                    : null;

            return [
                'Candidate advanced successfully',
                true,
                {
                    currentRound: nextRound,
                    totalRounds,
                    pipelineComplete: nextRound > totalRounds,
                    nextRound: nextRoundConfig
                        ? {
                              roundNumber: nextRoundConfig.roundNumber,
                              roundName: nextRoundConfig.roundName,
                              interviewType: nextRoundConfig.interviewType,
                              isOptional: nextRoundConfig.isOptional,
                          }
                        : null,
                },
            ];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async rejectCandidate(
        feedbackId: string,
        userId: string,
        dto?: RejectCandidateDto,
    ): Promise<[string, boolean]> {
        try {
            const feedback = await this.feedbackModel.findById(feedbackId);
            if (!feedback) return ['Feedback not found', false];
            if (feedback.isRejected) {
                return ['Candidate already rejected', false];
            }
            if (feedback.isHired) {
                return ['Candidate already hired, cannot reject', false];
            }

            const currentRound = feedback.currentRound;

            if (currentRound >= 1) {
                const interview = await this.applicantInterviewerModel.findOne({
                    applicantJobFeedbackId: feedbackId,
                    roundNumber: currentRound,
                    status: InterviewStatus.COMPLETED,
                });

                if (interview && !interview.roundOutcome) {
                    interview.roundOutcome = RoundOutcome.FAILED;
                    interview.outcomeDecidedBy = new Types.ObjectId(userId);
                    interview.outcomeNotes = dto?.notes;
                    await interview.save();
                }
            }

            feedback.isRejected = true;
            feedback.applicantStatus = ApplicantJobStatus.REJECT;
            feedback.isProcessCompleted = true;
            await feedback.save();

            return ['Candidate rejected', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async skipRound(
        feedbackId: string,
        dto: SkipRoundDto,
    ): Promise<[string, boolean]> {
        try {
            const feedback = await this.feedbackModel.findById(feedbackId);
            if (!feedback) return ['Feedback not found', false];
            if (feedback.isRejected) {
                return ['Candidate has been rejected', false];
            }

            const activeRound =
                feedback.currentRound === 0 ? 1 : feedback.currentRound;
            if (activeRound !== dto.roundNumber) {
                return [
                    `Can only skip the current round (${activeRound})`,
                    false,
                ];
            }

            const job = await this.jobModel
                .findById(feedback.jobId)
                .select('interviewPipeline')
                .lean();

            if (!job?.interviewPipeline?.length) {
                return ['Job pipeline not found', false];
            }

            const roundConfig = job.interviewPipeline.find(
                (r) => r.roundNumber === dto.roundNumber,
            );

            if (!roundConfig) {
                return [
                    `Round ${dto.roundNumber} not found in pipeline`,
                    false,
                ];
            }

            if (!roundConfig.isOptional) {
                return [
                    `Round ${dto.roundNumber} ("${roundConfig.roundName}") is not optional and cannot be skipped`,
                    false,
                ];
            }

            const totalRounds = job.interviewPipeline.length;
            const nextRound = dto.roundNumber + 1;

            feedback.currentRound = nextRound;
            feedback.completedRounds.push(dto.roundNumber);
            feedback.totalRoundsCompleted += 1;

            if (nextRound > totalRounds) {
                feedback.isProcessCompleted = true;
            }

            await feedback.save();

            return ['Round skipped successfully', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async hireCandidate(
        feedbackId: string,
        extraData: Record<string, any> = {},
    ): Promise<[string, boolean]> {
        try {
            const feedback = await this.feedbackModel.findById(feedbackId);
            if (!feedback) return ['Feedback not found', false];
            if (feedback.isHired) return ['Candidate already hired', false];
            if (feedback.isRejected) {
                return ['Candidate has been rejected', false];
            }
            if (!feedback.isProcessCompleted) {
                return ['Cannot hire before all rounds are completed', false];
            }

            feedback.isHired = true;
            feedback.applicantStatus = ApplicantJobStatus.ACCEPT;
            await feedback.save();

            this.integrationSyncService
                .syncCandidate(feedbackId, extraData)
                .catch((err) =>
                    this.logger.error(
                        `Integration sync failed for feedbackId ${feedbackId}: ${err.message}`,
                    ),
                );

            return ['Candidate hired successfully', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async getCandidatePipeline(
        feedbackId: string,
    ): Promise<[string, boolean, any]> {
        try {
            const feedback = await this.feedbackModel
                .findById(feedbackId)
                .select(
                    'jobId currentRound totalRoundsCompleted completedRounds isRejected isHired isProcessCompleted applicantStatus',
                )
                .lean();

            if (!feedback) return ['Feedback not found', false, null];

            const job = await this.jobModel
                .findById(feedback.jobId)
                .select('interviewPipeline title')
                .lean();

            if (!job) return ['Job not found', false, null];

            // Fetch all interviews for this candidate
            const interviews = await this.applicantInterviewerModel
                .find({ applicantJobFeedbackId: feedbackId })
                .sort({ roundNumber: 1 })
                .lean();

            // Fetch all evaluations for this candidate's interviews in one query
            const interviewIds = interviews
                .filter((i) => i._id)
                .map((i) => i._id);

            const evaluations = await this.evaluationModel
                .find({
                    applicantInterviewId: { $in: interviewIds },
                    status: 'completed',
                })
                .lean();

            // Index evaluations by applicantInterviewId string for O(1) lookup
            const evalByInterviewId = new Map(
                evaluations.map((e) => [e.applicantInterviewId.toString(), e]),
            );

            // Build per-round status view
            const rounds = (job.interviewPipeline ?? []).map((roundConfig) => {
                const interview = interviews.find(
                    (i) => i.roundNumber === roundConfig.roundNumber,
                );

                const isSkipped =
                    feedback.completedRounds.includes(
                        roundConfig.roundNumber,
                    ) && !interview;

                let roundStatus: string;
                if (isSkipped) {
                    roundStatus = 'skipped';
                } else if (!interview) {
                    roundStatus = 'not_started';
                } else {
                    switch (interview.status) {
                        case InterviewStatus.PENDING:
                            roundStatus = 'pending';
                            break;
                        case InterviewStatus.SCHEDULED:
                            roundStatus = 'scheduled';
                            break;
                        case InterviewStatus.RESCHEDULED:
                            roundStatus = 'scheduled';
                            break;
                        case InterviewStatus.COMPLETED:
                            roundStatus = 'completed';
                            break;
                        case InterviewStatus.CANCELLED:
                            roundStatus = 'cancelled';
                            break;
                        default:
                            roundStatus = 'pending';
                    }
                }

                const evalDoc = interview
                    ? evalByInterviewId.get(interview._id.toString())
                    : undefined;

                const evaluation = evalDoc
                    ? {
                          _id: evalDoc._id.toString(),
                          status: evalDoc.status,
                          recommendation: evalDoc.recommendation ?? null,
                          averageScore: evalDoc.averageScore ?? null,
                          averageConfidence: evalDoc.averageConfidence ?? null,
                          overallSummary: evalDoc.overallSummary ?? null,
                          evaluatedAt:
                              evalDoc.evaluatedAt?.toISOString() ?? null,
                          results: (evalDoc.results ?? []).map((r) => ({
                              checklistId: r.checklistId?.toString() ?? '',
                              criterion: r.criterion,
                              category: r.category,
                              score: r.score,
                              justification: r.justification,
                              evidence: r.evidence ?? [],
                              confidence: r.confidence,
                          })),
                      }
                    : null;

                return {
                    roundNumber: roundConfig.roundNumber,
                    roundName: roundConfig.roundName,
                    interviewType: roundConfig.interviewType,
                    isOptional: roundConfig.isOptional,
                    hasChecklist: (roundConfig.checkLists?.length ?? 0) > 0,
                    status: roundStatus,
                    interviewId: interview?._id?.toString() ?? null,
                    scheduledAt: interview?.scheduledAt ?? null,
                    roundOutcome: interview?.roundOutcome ?? null,
                    interviewerId: interview?.interviewerId?.toString() ?? null,
                    evaluation,
                };
            });

            return [
                'Success',
                true,
                {
                    jobTitle: job.title,
                    currentRound: feedback.currentRound,
                    totalRounds: job.interviewPipeline?.length ?? 0,
                    totalRoundsCompleted: feedback.totalRoundsCompleted,
                    completedRounds: feedback.completedRounds,
                    isRejected: feedback.isRejected,
                    isHired: feedback.isHired,
                    isProcessCompleted: feedback.isProcessCompleted,
                    applicantStatus: feedback.applicantStatus,
                    rounds,
                },
            ];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    /**
     * Checkpoint-based retry for the evaluation pipeline.
     *
     * Checkpoint 1 — recording.status === 'failed'
     *   → re-emit process-interview-audio (re-run transcription)
     *
     * Checkpoint 2 — recording completed, transcript exists, evaluation missing or failed
     *   → re-emit evaluate-interview (re-run AI evaluation only)
     */
    async retryEvaluationPipeline(
        applicantInterviewId: string,
        tenantId: string,
    ): Promise<[string, boolean]> {
        try {
            // Validate interview belongs to tenant
            const interview = await this.applicantInterviewerModel
                .findOne({
                    _id: new Types.ObjectId(applicantInterviewId),
                    tenantId: new Types.ObjectId(tenantId),
                })
                .lean();

            if (!interview) return ['Interview not found', false];

            // Find the most recent recording for this interview
            const recording = await this.interviewRecordingModel
                .findOne({
                    applicantInterviewId: new Types.ObjectId(
                        applicantInterviewId,
                    ),
                })
                .sort({ createdAt: -1 })
                .lean();

            if (!recording)
                return ['No recording found for this interview', false];

            // Pipeline still in-flight — nothing to retry
            if (
                recording.status === 'queued' ||
                recording.status === 'processing'
            ) {
                return [
                    'Pipeline is still running — please wait before retrying',
                    false,
                ];
            }

            // ── CHECKPOINT 1: transcription failed ──────────────────────────────
            if (recording.status === 'failed') {
                await this.interviewRecordingModel.findByIdAndUpdate(
                    recording._id,
                    {
                        status: 'queued',
                        errorMessage: null,
                    },
                );

                this.aiClient.emit(
                    RMQ_CONSTANTS.AI.listensTo.process_interview_audio,
                    {
                        recordingId: recording._id.toString(),
                        audioUrl: recording.audioUrl,
                        applicantInterviewId,
                        metadata: {
                            duration: recording.duration ?? 0,
                            mimeType: recording.mimeType ?? 'audio/webm',
                            recordedAt:
                                recording.recordedAt?.toISOString() ??
                                new Date().toISOString(),
                        },
                    },
                );

                this.logger.log(
                    `Retry: re-emitting process-interview-audio for recording ${recording._id}`,
                );
                return ['Transcription retry initiated', true];
            }

            // ── Recording completed — check transcript ───────────────────────────
            const transcript = await this.interviewTranscriptModel
                .findOne({ interviewRecordingId: recording._id })
                .lean();

            if (!transcript) {
                return [
                    'Transcript not found — the recording may be corrupted. Please re-upload the audio.',
                    false,
                ];
            }

            // ── Check evaluation state ───────────────────────────────────────────
            const evaluation = await this.evaluationModel
                .findOne({
                    applicantInterviewId: new Types.ObjectId(
                        applicantInterviewId,
                    ),
                })
                .lean();

            if (evaluation?.status === 'completed') {
                return [
                    'Evaluation already completed — no retry needed',
                    false,
                ];
            }

            // ── CHECKPOINT 2: evaluation missing or failed → re-trigger AI eval ──

            // Subscription quota check
            const { allowed, reason } =
                await this.subscriptionGuardService.canUseEvaluation(tenantId);
            if (!allowed) {
                return [
                    `Evaluation blocked: ${reason ?? 'quota exceeded'}`,
                    false,
                ];
            }

            // Remove stale failed record — transcriptId has a unique index,
            // so we must delete before re-inserting.
            if (evaluation) {
                await this.evaluationModel.findByIdAndDelete(evaluation._id);
            }

            // Rebuild checklist snapshot from interview record
            const enabledChecklists = (interview.roundCheckLists ?? []).filter(
                (c) => c.enabled !== false,
            );

            if (enabledChecklists.length === 0) {
                return [
                    'No enabled checklists on this interview round — evaluation cannot run',
                    false,
                ];
            }

            const evaluationMessage: EvaluateInterviewMessage = {
                transcriptId: transcript._id.toString(),
                applicantInterviewId,
                jobId: interview.jobId.toString(),
                checkLists: enabledChecklists.map((c) => ({
                    _id: c._id,
                    criterion: c.criterion,
                    category: c.category,
                    scoring: {
                        min: c.scoring.min,
                        max: c.scoring.max,
                        anchors: c.scoring.anchors,
                    },
                })),
                transcript: {
                    speakerTurns: transcript.speakerTurns,
                    averageConfidence: transcript.averageConfidence ?? 0,
                },
            };

            this.aiClient.emit(
                RMQ_CONSTANTS.AI.listensTo.evaluate_interview,
                evaluationMessage,
            );
            await this.subscriptionGuardService.recordEvalBlockUsage(tenantId);

            this.logger.log(
                `Retry: re-emitting evaluate-interview for interview ${applicantInterviewId}`,
            );
            return ['Evaluation retry initiated', true];
        } catch (err) {
            return [err.message, false];
        }
    }
}
