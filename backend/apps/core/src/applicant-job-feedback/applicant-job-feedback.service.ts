import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, {
    AggregatePaginateModel,
    ClientSession,
    Connection,
    Model,
    Types,
} from 'mongoose';
import {
    ApplicantDetailFilterDto,
    ApplicantDetailsResponseDto,
    ApplicantOverallSummaryDto,
    ApplicantSummaryResponseDto,
    ApplicantTenantSummaryDto,
    CreateApplicantJobFeedbackDto,
    GetAllJobApplicantDto,
    GetApplicantTenantDto,
    GetInterviewEvaluationDto,
    GetJobApplicantDto,
    JobApplicantFilterDto,
    MetricAnalysisDto,
} from './dto/applicant-job-feedback.dto';
import { AIResponseInterface } from '@app/common/interface/ai-analysis-payload.interface';
import {
    ApplicantJobStatus,
    EmailTemplate,
    InterviewStatus,
    InterviewType,
} from '@app/common/enums/app.enums';
import {
    ApplicantJobFeedback,
    ApplicantJobFeedbackDocument,
    InterviewEvaluation,
    InterviewEvaluationDocument,
} from '@app/common';
import { PaginatedData } from '../common/pagination/paginated-data.pagination';
import { EmailHelperData, SendEmail } from '../email/interface/email.interface';
import { EmailService } from '../email/email.service';
import { SendEmailDto } from '../email/dto/email.dto';
import { getEnumText } from '@app/common/enums/enum.helper';
import { toLocal, toUtc } from '../common/helper/timezone-handler.helper';
import { ApplicantSummaryAggregationResult } from './interface/applicant-job-feedback.interface';
import { DateTime } from 'luxon';
import { ApplicantService } from '../applicant/applicant.service';

@Injectable()
export class ApplicantJobFeedbackService {
    constructor(
        @InjectModel(ApplicantJobFeedback.name)
        private readonly applicantJobFeedbackModel: AggregatePaginateModel<ApplicantJobFeedbackDocument>,
        @InjectModel(InterviewEvaluation.name)
        private readonly interviewEvaluationModel: Model<InterviewEvaluationDocument>,
        private readonly emailService: EmailService,
        private readonly applicantService: ApplicantService,
        @InjectConnection() private readonly connection: Connection,
    ) {}

    async create(
        dto: CreateApplicantJobFeedbackDto,
        session?: ClientSession,
    ): Promise<[string, boolean, string]> {
        try {
            const model = new this.applicantJobFeedbackModel({
                applicantId: dto.applicantId,
                email: dto.email,
                jobId: dto.jobId,
                cvUrl: dto.cvUrl,
                applicantStatus: ApplicantJobStatus.PENDING,
                tenantId: dto.tenantId,
                ...(dto.source !== undefined && { source: dto.source }),
            });
            await model.save({ session });
            return ['Success', true, model.id];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async delete(id: string): Promise<[string, boolean]> {
        try {
            await this.applicantJobFeedbackModel.findByIdAndDelete(id).exec();
            return ['Success', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async updateFeedback(
        id: string,
        data: AIResponseInterface,
    ): Promise<[string, boolean]> {
        const session = await this.connection.startSession();

        try {
            session.startTransaction();

            const update = await this.applicantJobFeedbackModel
                .findByIdAndUpdate(
                    id,
                    {
                        $set: {
                            feedback: data.feedback,
                            applicantStatus: ApplicantJobStatus.ANALYZED,
                            cvMatch: data.percentage,
                            analysis: data.metricFeedback.map((item) => ({
                                metricId: new mongoose.Types.ObjectId(
                                    item.metricId,
                                ),
                                percentage: item.percentage,
                            })),
                        },
                    },
                    { new: true, session },
                )
                .exec();

            const [msg, ok] = await this.applicantService.updateContact(
                update.applicantId.toString(),
                data.contact ?? null,
                session,
            );

            if(!ok){
                session.abortTransaction;
                return [msg, false];
            }

            await session.commitTransaction();
            return ['Success', true];
        } catch (err) {
            await session.abortTransaction();
            return [err.message, false];
        } finally {
            session.endSession;
        }
    }

    async getApplicantId(
        id: string,
    ): Promise<[string, boolean, string | null]> {
        try {
            const data = await this.applicantJobFeedbackModel
                .findById(id)
                .select('applicantId -_id')
                .lean();

            if (!data) {
                return ['Feedback not found', false, null];
            }

            return ['Success', true, data.applicantId.toString()];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async getAllJobApplicant(
        jobId: string,
        tenantId: string,
        filterDto: JobApplicantFilterDto,
    ): Promise<[string, boolean, PaginatedData<GetAllJobApplicantDto>]> {
        try {
            const { page, limit, minScore, maxScore, progressStatus } =
                filterDto;

            const match: Record<string, any> = {
                jobId: new Types.ObjectId(jobId),
                tenantId: new Types.ObjectId(tenantId),
            };

            if (minScore !== undefined || maxScore !== undefined) {
                match.cvMatch = {};
                if (minScore !== undefined) {
                    match.cvMatch.$gte = minScore;
                }
                if (maxScore !== undefined) {
                    match.cvMatch.$lte = maxScore;
                }
            }

            if (progressStatus !== undefined) {
                if (
                    Array.isArray(progressStatus) &&
                    progressStatus.length > 0
                ) {
                    match.applicantStatus = { $in: progressStatus };
                } else if (typeof progressStatus === 'number') {
                    match.applicantStatus = progressStatus;
                }
            }

            const agg = this.applicantJobFeedbackModel.aggregate([
                { $match: match },
                {
                    $lookup: {
                        from: 'applicants',
                        localField: 'applicantId',
                        foreignField: '_id',
                        as: 'applicant',
                        pipeline: [
                            {
                                $project: {
                                    fullName: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $unwind: {
                        path: '$applicant',
                        preserveNullAndEmptyArrays: false,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        email: 1,
                        cvMatch: 1,
                        applicantName: '$applicant.fullName',
                        createdAt: 1,
                        cvUrl: 1,
                        video: 1,
                        jobId: 1,
                        applicantId: 1,
                        applicantStatus: 1,
                        source: 1,
                    },
                },
                { $sort: { applicantStatus: -1, cvMatch: -1 } },
            ]);

            const result =
                await this.applicantJobFeedbackModel.aggregatePaginate(agg, {
                    page,
                    limit,
                    useFacet: true,
                });

            const items: GetAllJobApplicantDto[] = result.docs.map((data) => ({
                id: data._id.toString(),
                applicantId: data.applicantId.toString(),
                applicantName: data.applicantName,
                progress: data.applicantStatus,
                appliedAt: data.createdAt.toISOString() || null,
                cvUrl: data.cvUrl,
                score: data.cvMatch,
                jobId: data.jobId.toString(),
                email: data.email,
                video: data.video,
                source: data.source,
            }));

            const data = new PaginatedData<GetAllJobApplicantDto>(
                items,
                result.totalDocs,
                result.page,
                result.limit,
            );

            return ['Success', true, data];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async getJobApplicant(
        id: string,
        tenantId: string,
    ): Promise<[string, boolean, GetJobApplicantDto | null]> {
        try {
            const result = await this.applicantJobFeedbackModel.aggregate([
                {
                    $match: {
                        _id: new Types.ObjectId(id),
                        tenantId: new Types.ObjectId(tenantId),
                    },
                },
                {
                    $lookup: {
                        from: 'jobs',
                        localField: 'jobId',
                        foreignField: '_id',
                        as: 'job',
                    },
                },
                {
                    $unwind: '$job',
                },
                {
                    $unwind: {
                        path: '$analysis',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $addFields: {
                        'analysis.metricDetails': {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: '$job.metrics',
                                        as: 'metric',
                                        cond: {
                                            $eq: [
                                                '$$metric._id',
                                                '$analysis.metricId',
                                            ],
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: '$_id',
                        cvMatch: { $first: '$cvMatch' },
                        feedback: { $first: '$feedback' },
                        applicantStatus: { $first: '$applicantStatus' },
                        source: { $first: '$source' },
                        analysis: {
                            $push: {
                                metricId: '$analysis.metricId',
                                percentage: '$analysis.percentage',
                                metricTitle: '$analysis.metricDetails.title',
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: 'applicantInterviews',
                        let: { feedbackId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: [
                                            '$applicantJobFeedbackId',
                                            '$$feedbackId',
                                        ],
                                    },
                                },
                            },
                            { $sort: { createdAt: -1 } },
                            { $limit: 1 },
                            { $project: { _id: 1, status: 1 } },
                        ],
                        as: 'interview',
                    },
                },
                {
                    $unwind: {
                        path: '$interview',
                        preserveNullAndEmptyArrays: true,
                    },
                },
            ]);

            if (!result || result.length === 0) {
                return ['Applicant feedback not found', false, null];
            }

            const data = result[0];

            const metricAnalysis: MetricAnalysisDto[] =
                data.analysis
                    ?.filter((a: any) => a.metricId)
                    .map((analysis: any) => ({
                        metricId: analysis.metricId?.toString(),
                        metric: analysis.metricTitle,
                        percentage: analysis.percentage,
                    })) ?? [];

            const dto: GetJobApplicantDto = {
                score: data.cvMatch,
                feedback: data.feedback,
                metricAnalysis,
                interviewId: data.interview?._id?.toString() ?? undefined,
                interviewStatus: data.interview?.status ?? undefined,
                applicantStatus: data.applicantStatus ?? undefined,
                source: data.source ?? undefined,
            };

            return ['Success', true, dto];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    private async extractEmailHelperData(
        applicantJobFeedbackId: string,
        tenantId: string,
    ): Promise<[string, boolean, EmailHelperData | null]> {
        try {
            const result = await this.applicantJobFeedbackModel.aggregate([
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(
                            applicantJobFeedbackId,
                        ),
                        tenantId: new mongoose.Types.ObjectId(tenantId),
                    },
                },
                { $limit: 1 },
                {
                    $lookup: {
                        from: 'applicants',
                        localField: 'applicantId',
                        foreignField: '_id',
                        as: 'applicant',
                        pipeline: [
                            {
                                $project: {
                                    fullName: 1,
                                    email: 1,
                                    _id: 0,
                                },
                            },
                            { $limit: 1 },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: 'jobs',
                        localField: 'jobId',
                        foreignField: '_id',
                        as: 'job',
                        pipeline: [
                            {
                                $project: {
                                    title: 1,
                                    _id: 0,
                                },
                            },
                            { $limit: 1 },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: 'tenants',
                        localField: 'tenantId',
                        foreignField: '_id',
                        as: 'tenant',
                        pipeline: [
                            {
                                $project: {
                                    name: 1,
                                    contactEmail: 1,
                                    sesMail: 1,
                                    logoUrl: 1,
                                    websiteUrl: 1,
                                    _id: 0,
                                },
                            },
                            { $limit: 1 },
                        ],
                    },
                },
                {
                    $project: {
                        fromEmail: {
                            $arrayElemAt: ['$tenant.sesMail', 0],
                        },
                        fromName: { $arrayElemAt: ['$tenant.name', 0] },
                        toEmail: {
                            $arrayElemAt: ['$applicant.email', 0],
                        },
                        applicantName: {
                            $arrayElemAt: ['$applicant.fullName', 0],
                        },
                        jobTitle: { $arrayElemAt: ['$job.title', 0] },
                        companyName: {
                            $arrayElemAt: ['$tenant.name', 0],
                        },
                        logoUrl: { $arrayElemAt: ['$tenant.logoUrl', 0] },
                        websiteUrl: { $arrayElemAt: ['$tenant.websiteUrl', 0] },
                        companyEmail: {
                            $arrayElemAt: ['$tenant.contactEmail', 0],
                        },
                        _id: 0,
                    },
                },
            ]);

            if (!result || result.length === 0) {
                return ['Applicant job feedback not found', false, null];
            }

            return ['Success', true, result[0]];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async sendApplicantEmail(
        applicantJobFeedbackId: string,
        tenantId: string,
        dto: SendEmailDto,
    ): Promise<[string, boolean]> {
        try {
            const [extractMsg, extractSuccess, emailData] =
                await this.extractEmailHelperData(
                    applicantJobFeedbackId,
                    tenantId,
                );

            if (!extractSuccess || !emailData) {
                return [extractMsg, false];
            }

            const updatedEmailData: EmailHelperData = {
                ...emailData,
                salary: dto.salary,
                startDate:
                    dto.startDate != null ? new Date(dto.startDate) : null,
                feedback: dto.feedback,
            };

            const [emailMsg, emailSuccess] = await this.sendEmail(
                dto.emailType,
                updatedEmailData,
                tenantId,
            );

            if (!emailSuccess) {
                return [emailMsg, false];
            }

            return ['Email sent successfully', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    private async sendEmail(
        emailType: EmailTemplate,
        emailData: EmailHelperData,
        tenantId?: string,
    ): Promise<[string, boolean]> {
        try {
            const emailPayload: SendEmail = {
                fromEmail: emailData.fromEmail,
                fromName: emailData.fromName,
                toEmail: emailData.toEmail,
                emailType,
                ...(tenantId && { tenantId }),
                applicantName: emailData.applicantName,
                jobTitle: emailData.jobTitle,
                companyName: emailData.companyName,
                logoUrl: emailData.logoUrl,
                websiteUrl: emailData.websiteUrl,
                companyEmail: emailData.companyEmail,
                salary: emailData.salary,
                startDate:
                    emailData.startDate != null
                        ? emailData.startDate.toString().slice(0, 11)
                        : null,
                feedback: emailData.feedback,
            };

            const [msg, ok] = await this.emailService.sendEmail(emailPayload);

            if (!ok) {
                return [msg, false];
            }

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    private async updateProcessStatus(
        applicantJobFeedbackId: string,
        tenantId: string,
        status: ApplicantJobStatus,
        session: ClientSession,
    ): Promise<[string, boolean]> {
        try {
            const result = await this.applicantJobFeedbackModel.updateOne(
                {
                    _id: new mongoose.Types.ObjectId(applicantJobFeedbackId),
                    tenantId: new mongoose.Types.ObjectId(tenantId),
                },
                {
                    $set: {
                        isProcessCompleted: true,
                        applicantStatus: status,
                    },
                },
                { session },
            );

            if (result.matchedCount === 0) {
                return ['Document not found for update', false];
            }

            if (result.modifiedCount === 0) {
                return ['No changes made to document', false];
            }

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async getApplicantDetails(
        applicantId: string,
        filter: ApplicantDetailFilterDto,
        timezone: string,
    ): Promise<[string, boolean, ApplicantDetailsResponseDto]> {
        try {
            const now = toUtc(DateTime.now().toISO(), timezone);
            const { tenantId, status } = filter;
            const objectId = new Types.ObjectId(applicantId);

            const matchConditions: any = { applicantId: objectId };

            if (tenantId) {
                matchConditions.tenantId = new Types.ObjectId(tenantId);
            }

            if (status !== undefined) {
                if (Array.isArray(status) && status.length > 0) {
                    matchConditions.applicantStatus = { $in: status };
                } else if (typeof status === 'number') {
                    matchConditions.applicantStatus = status;
                }
            }

            const results = await this.applicantJobFeedbackModel.aggregate([
                { $match: matchConditions },
                {
                    $lookup: {
                        from: 'jobs',
                        let: { jobId: '$jobId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$jobId'] } } },
                            { $project: { _id: 1, title: 1 } },
                        ],
                        as: 'job',
                    },
                },
                { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'tenants',
                        let: { tenantId: '$tenantId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$_id', '$$tenantId'] },
                                },
                            },
                            { $project: { _id: 1, name: 1 } },
                        ],
                        as: 'tenant',
                    },
                },
                {
                    $unwind: {
                        path: '$tenant',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: 'applicantInterviews',
                        let: { feedbackId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: [
                                            '$applicantJobFeedbackId',
                                            '$$feedbackId',
                                        ],
                                    },
                                },
                            },
                            { $sort: { createdAt: -1 } },
                            { $limit: 1 },
                            {
                                $project: {
                                    _id: 1,
                                    interviewerId: 1,
                                    status: 1,
                                    interviewType: 1,
                                    scheduledAt: 1,
                                    scheduledEndTime: 1,
                                    duration: 1,
                                    isCompleted: 1,
                                    completedAt: 1,
                                    rescheduleCount: 1,
                                    timeSlotId: 1,
                                    hangoutLink: 1,
                                    onsiteLocation: 1,
                                    onsiteAddress: 1,
                                    onsiteInstructions: 1,
                                    attendees: 1,
                                    notes: 1,
                                    cancellationReason: 1,
                                    cancelledAt: 1,
                                },
                            },
                        ],
                        as: 'interview',
                    },
                },
                {
                    $unwind: {
                        path: '$interview',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: 'interviewers',
                        let: { interviewerId: '$interview.interviewerId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$_id', '$$interviewerId'] },
                                },
                            },
                            {
                                $lookup: {
                                    from: 'users',
                                    let: { userId: '$userId' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$userId'],
                                                },
                                            },
                                        },
                                        {
                                            $project: {
                                                _id: 1,
                                                name: 1,
                                                emailAddress: 1,
                                            },
                                        },
                                    ],
                                    as: 'user',
                                },
                            },
                            {
                                $unwind: {
                                    path: '$user',
                                    preserveNullAndEmptyArrays: true,
                                },
                            },
                            {
                                $project: {
                                    _id: 1,
                                    userId: 1,
                                    timeSlots: 1,
                                    user: 1,
                                },
                            },
                        ],
                        as: 'interviewer',
                    },
                },
                {
                    $unwind: {
                        path: '$interviewer',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        applicationId: '$_id',
                        jobId: 1,
                        jobTitle: '$job.title',
                        tenantId: 1,
                        tenantName: '$tenant.name',

                        applicantStatus: 1,
                        isProcessCompleted: 1,
                        email: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        source: 1,

                        interviewDetails: {
                            $cond: [
                                { $ifNull: ['$interview', false] },
                                {
                                    interviewId: '$interview._id',
                                    status: '$interview.status',
                                    interviewType: '$interview.interviewType',
                                    scheduledAt: '$interview.scheduledAt',
                                    scheduledEndTime:
                                        '$interview.scheduledEndTime',
                                    duration: '$interview.duration',
                                    isCompleted: '$interview.isCompleted',
                                    completedAt: '$interview.completedAt',
                                    rescheduleCount:
                                        '$interview.rescheduleCount',
                                    timeSlotId: '$interview.timeSlotId',
                                    meetLink: '$interview.hangoutLink',
                                    onsiteLocation: '$interview.onsiteLocation',
                                    onsiteAddress: '$interview.onsiteAddress',
                                    onsiteInstructions:
                                        '$interview.onsiteInstructions',
                                    attendees: '$interview.attendees',
                                    notes: '$interview.notes',
                                    cancellationReason:
                                        '$interview.cancellationReason',
                                    cancelledAt: '$interview.cancelledAt',

                                    interviewer: {
                                        $cond: [
                                            {
                                                $ifNull: [
                                                    '$interviewer',
                                                    false,
                                                ],
                                            },
                                            {
                                                interviewerId:
                                                    '$interviewer._id',
                                                interviewerName:
                                                    '$interviewer.user.name',
                                                email: '$interviewer.user.emailAddress',
                                                userId: '$interviewer.userId',
                                            },
                                            null,
                                        ],
                                    },

                                    availableTimeSlots: {
                                        $cond: {
                                            if: {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            '$interview.status',
                                                            InterviewStatus.PENDING,
                                                        ],
                                                    },
                                                ],
                                            },
                                            then: {
                                                $map: {
                                                    input: {
                                                        $filter: {
                                                            input: '$interviewer.timeSlots',
                                                            as: 'slot',
                                                            cond: {
                                                                $and: [
                                                                    {
                                                                        $ne: [
                                                                            '$$slot.isDeleted',
                                                                            true,
                                                                        ],
                                                                    },
                                                                    {
                                                                        $ne: [
                                                                            '$$slot.selected',
                                                                            true,
                                                                        ],
                                                                    },
                                                                    {
                                                                        $ne: [
                                                                            '$$slot.reserved',
                                                                            true,
                                                                        ],
                                                                    },
                                                                    {
                                                                        $gte: [
                                                                            '$$slot.startTime',
                                                                            now,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                        },
                                                    },
                                                    as: 'filteredSlot',
                                                    in: {
                                                        id: {
                                                            $toString:
                                                                '$$filteredSlot._id',
                                                        },
                                                        startTime:
                                                            '$$filteredSlot.startTime',
                                                        endTime:
                                                            '$$filteredSlot.endTime',
                                                    },
                                                },
                                            },
                                            else: [],
                                        },
                                    },
                                },
                                null,
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: '$tenantId',
                        tenantName: { $first: '$tenantName' },
                        email: { $first: '$email' },
                        totalApplications: { $sum: 1 },
                        applications: {
                            $push: {
                                applicationId: '$applicationId',
                                jobId: '$jobId',
                                jobTitle: '$jobTitle',
                                applicantStatus: '$applicantStatus',
                                isProcessCompleted: '$isProcessCompleted',
                                createdAt: '$createdAt',
                                updatedAt: '$updatedAt',
                                source: '$source',
                                interviewDetails: '$interviewDetails',
                            },
                        },
                    },
                },

                { $sort: { tenantName: 1 } },

                {
                    $project: {
                        tenantId: '$_id',
                        tenantName: 1,
                        email: 1,
                        totalApplications: 1,
                        applications: 1,
                    },
                },
            ]);

            if (!results?.length) {
                const res: ApplicantDetailsResponseDto = {
                    applicantId: applicantId,
                    email: null,
                    totalTenants: 0,
                    totalApplications: 0,
                    tenants: [],
                };
                return ['Success', true, res];
            }

            for (const tenant of results) {
                tenant.applications = tenant.applications.map((app) => ({
                    ...app,
                    createdAt: app.createdAt
                        ? toLocal(app.createdAt, timezone)
                        : null,
                    updatedAt: app.updatedAt
                        ? toLocal(app.updatedAt, timezone)
                        : null,
                    statusLabel: getEnumText(
                        app.applicantStatus,
                        ApplicantJobStatus,
                    ),

                    interviewDetails: app.interviewDetails
                        ? {
                              ...app.interviewDetails,
                              interviewStatusLabel: getEnumText(
                                  app.interviewDetails.status,
                                  InterviewStatus,
                              ),
                              interviewTypeLabel: getEnumText(
                                  app.interviewDetails.interviewType,
                                  InterviewType,
                              ),
                              scheduledAt: app.interviewDetails.scheduledAt
                                  ? toLocal(
                                        app.interviewDetails.scheduledAt,
                                        timezone,
                                    )
                                  : null,
                              scheduledEndTime: app.interviewDetails
                                  .scheduledEndTime
                                  ? toLocal(
                                        app.interviewDetails.scheduledEndTime,
                                        timezone,
                                    )
                                  : null,
                              completedAt: app.interviewDetails.completedAt
                                  ? toLocal(
                                        app.interviewDetails.completedAt,
                                        timezone,
                                    )
                                  : null,
                              cancelledAt: app.interviewDetails.cancelledAt
                                  ? toLocal(
                                        app.interviewDetails.cancelledAt,
                                        timezone,
                                    )
                                  : null,
                              availableTimeSlots: app.interviewDetails
                                  .availableTimeSlots?.length
                                  ? app.interviewDetails.availableTimeSlots.map(
                                        (slot) => {
                                            const startLocal = toLocal(
                                                slot.startTime,
                                                timezone,
                                            );
                                            const endLocal = toLocal(
                                                slot.endTime,
                                                timezone,
                                            );
                                            return {
                                                id: slot.id,
                                                day: slot.startTime.toLocaleDateString(
                                                    'en-US',
                                                    {
                                                        weekday: 'long',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        timeZone: timezone,
                                                    },
                                                ),
                                                startTime: startLocal.slice(
                                                    11,
                                                    16,
                                                ),
                                                endTime: endLocal.slice(11, 16),
                                            };
                                        },
                                    )
                                  : [],
                          }
                        : undefined,
                }));
            }

            const response: ApplicantDetailsResponseDto = {
                applicantId: applicantId.toString(),
                email: results[0].email,
                totalTenants: results.length,
                totalApplications: results.reduce(
                    (sum, tenant) => sum + tenant.totalApplications,
                    0,
                ),
                tenants: results.map((t) => ({
                    tenantId: t.tenantId.toString(),
                    tenantName: t.tenantName,
                    totalApplications: t.totalApplications,
                    applications: t.applications,
                })),
            };

            return ['Success', true, response];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async getApplicantTenantsList(
        applicantId: string,
    ): Promise<[string, boolean, GetApplicantTenantDto[]]> {
        try {
            const objectId = new Types.ObjectId(applicantId);

            const results = await this.applicantJobFeedbackModel.aggregate([
                {
                    $match: { applicantId: objectId },
                },
                {
                    $group: {
                        _id: '$tenantId',
                    },
                },
                {
                    $lookup: {
                        from: 'tenants',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'tenantDetails',
                    },
                },
                {
                    $unwind: {
                        path: '$tenantDetails',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 0,
                        tenantId: '$_id',
                        tenantName: '$tenantDetails.name',
                    },
                },
                {
                    $sort: { tenantName: 1 },
                },
            ]);

            if (!results || results.length === 0) {
                return ['Success', true, []];
            }

            const data: GetApplicantTenantDto[] = results.map((tenant) => ({
                id: tenant.tenantId.toString(),
                name: tenant.tenantName || 'Unknown Tenant',
            }));

            return ['Success', true, data];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async getApplicantSummary(
        applicantId: string,
        tenantId?: string,
    ): Promise<[string, boolean, ApplicantSummaryResponseDto]> {
        try {
            const objectId = new mongoose.Types.ObjectId(applicantId);

            const matchConditions: any = { applicantId: objectId };

            if (tenantId) {
                matchConditions.tenantId = new mongoose.Types.ObjectId(
                    tenantId,
                );
            }

            const results =
                await this.applicantJobFeedbackModel.aggregate<ApplicantSummaryAggregationResult>(
                    [
                        { $match: matchConditions },
                        {
                            $lookup: {
                                from: 'tenants',
                                let: { tenantId: '$tenantId' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$_id', '$$tenantId'],
                                            },
                                        },
                                    },
                                    { $project: { _id: 1, name: 1 } },
                                ],
                                as: 'tenant',
                            },
                        },
                        {
                            $unwind: {
                                path: '$tenant',
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $lookup: {
                                from: 'applicantInterviews',
                                let: { feedbackId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: [
                                                    '$applicantJobFeedbackId',
                                                    '$$feedbackId',
                                                ],
                                            },
                                        },
                                    },
                                    { $sort: { createdAt: -1 } },
                                    { $limit: 1 },
                                    {
                                        $project: {
                                            _id: 1,
                                            status: 1,
                                            isCompleted: 1,
                                        },
                                    },
                                ],
                                as: 'interview',
                            },
                        },
                        {
                            $unwind: {
                                path: '$interview',
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $group: {
                                _id: {
                                    tenantId: '$tenantId',
                                    status: '$applicantStatus',
                                },
                                tenantName: { $first: '$tenant.name' },
                                count: { $sum: 1 },

                                totalInterviews: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $ifNull: [
                                                    '$interview._id',
                                                    false,
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },

                                pendingInterviews: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $eq: [
                                                    '$interview.status',
                                                    InterviewStatus.PENDING,
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },

                                scheduledInterviews: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $in: [
                                                    '$interview.status',
                                                    [
                                                        InterviewStatus.SCHEDULED,
                                                        InterviewStatus.RESCHEDULED,
                                                    ],
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },

                                completedInterviews: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $ifNull: [
                                                            '$interview._id',
                                                            false,
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            '$interview.isCompleted',
                                                            true,
                                                        ],
                                                    },
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },

                                cancelledInterviews: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $eq: [
                                                    '$interview.status',
                                                    InterviewStatus.CANCELLED,
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                            },
                        },
                        {
                            $group: {
                                _id: '$_id.tenantId',
                                tenantName: { $first: '$tenantName' },
                                totalApplications: { $sum: '$count' },

                                byStatusArr: {
                                    $push: {
                                        k: { $toString: '$_id.status' },
                                        v: '$count',
                                    },
                                },

                                totalInterviews: { $sum: '$totalInterviews' },
                                pendingInterviews: {
                                    $sum: '$pendingInterviews',
                                },
                                scheduledInterviews: {
                                    $sum: '$scheduledInterviews',
                                },
                                completedInterviews: {
                                    $sum: '$completedInterviews',
                                },
                                cancelledInterviews: {
                                    $sum: '$cancelledInterviews',
                                },
                            },
                        },
                        {
                            $addFields: {
                                byStatus: { $arrayToObject: '$byStatusArr' },
                            },
                        },

                        { $sort: { tenantName: 1 } },

                        {
                            $project: {
                                _id: 0,
                                tenantId: '$_id',
                                tenantName: 1,
                                totalApplications: 1,
                                byStatus: 1,
                                interviewStats: {
                                    totalInterviews: '$totalInterviews',
                                    pendingInterviews: '$pendingInterviews',
                                    scheduledInterviews: '$scheduledInterviews',
                                    completedInterviews: '$completedInterviews',
                                    cancelledInterviews: '$cancelledInterviews',
                                },
                            },
                        },
                    ],
                );

            if (!results?.length) {
                return ['no data found', false, null];
            }

            const convertStatusToText = (byStatus: Record<string, number>) => {
                const output: Record<string, number> = {};

                for (const [statusKey, count] of Object.entries(
                    byStatus || {},
                )) {
                    const statusNum = Number(statusKey);
                    if (Number.isNaN(statusNum)) continue;

                    const label = getEnumText(statusNum, ApplicantJobStatus);
                    output[label] = (output[label] || 0) + count;
                }

                return Object.fromEntries(
                    Object.entries(output).filter(([, v]) => v > 0),
                );
            };

            const overallSummary: ApplicantOverallSummaryDto = {
                byStatus: {},
                totalInterviews: 0,
                pendingInterviews: 0,
                scheduledInterviews: 0,
                completedInterviews: 0,
                cancelledInterviews: 0,
            };

            let totalApplications = 0;

            const tenantSummaries: ApplicantTenantSummaryDto[] = results.map(
                (t) => {
                    totalApplications += t.totalApplications;

                    overallSummary.totalInterviews +=
                        t.interviewStats.totalInterviews;
                    overallSummary.pendingInterviews +=
                        t.interviewStats.pendingInterviews;
                    overallSummary.scheduledInterviews +=
                        t.interviewStats.scheduledInterviews;
                    overallSummary.completedInterviews +=
                        t.interviewStats.completedInterviews;
                    overallSummary.cancelledInterviews +=
                        t.interviewStats.cancelledInterviews;

                    const byStatusText = convertStatusToText(t.byStatus);

                    for (const [label, count] of Object.entries(byStatusText)) {
                        overallSummary.byStatus[label] =
                            (overallSummary.byStatus[label] || 0) + count;
                    }

                    return {
                        tenantId: t.tenantId.toString(),
                        tenantName: t.tenantName || 'Unknown Tenant',
                        totalApplications: t.totalApplications,
                        byStatus: byStatusText,
                        interviewStats: t.interviewStats,
                    };
                },
            );

            overallSummary.byStatus = Object.fromEntries(
                Object.entries(overallSummary.byStatus).filter(
                    ([, v]) => v > 0,
                ),
            );

            const response: ApplicantSummaryResponseDto = {
                applicantId: applicantId.toString(),
                totalApplications,
                totalTenants: tenantSummaries.length,
                overallSummary,
                tenantSummaries,
            };

            return ['Success', true, response];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async updateInterviewStatus(
        id: string,
        session: ClientSession,
    ): Promise<[string, boolean]> {
        try {
            const result = await this.applicantJobFeedbackModel.updateOne(
                {
                    _id: id,
                },
                { $set: { applicantStatus: ApplicantJobStatus.INTERVIEW } },
                { session },
            );

            if (result.modifiedCount === 0) {
                return ['Error while updating applicant job status', false];
            }

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async updateInterviewCompletion(
        _id: string,
        _session?: ClientSession,
    ): Promise<[string, boolean]> {
        try {
            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async getInterviewEvaluation(
        feedbackId: string,
        tenantId: string,
    ): Promise<[string, boolean, GetInterviewEvaluationDto | null]> {
        try {
            const feedback = await this.applicantJobFeedbackModel
                .findOne({
                    _id: new Types.ObjectId(feedbackId),
                    tenantId: new Types.ObjectId(tenantId),
                })
                .select('_id')
                .lean();

            if (!feedback) {
                return ['Applicant feedback not found', false, null];
            }

            const result = await this.interviewEvaluationModel.aggregate([
                {
                    $lookup: {
                        from: 'applicantInterviews',
                        let: { interviewId: '$applicantInterviewId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ['$_id', '$$interviewId'],
                                            },
                                            {
                                                $eq: [
                                                    '$applicantJobFeedbackId',
                                                    new Types.ObjectId(
                                                        feedbackId,
                                                    ),
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                            { $project: { _id: 1 } },
                        ],
                        as: 'matchedInterview',
                    },
                },
                {
                    $match: {
                        'matchedInterview.0': { $exists: true },
                    },
                },
                { $limit: 1 },
                { $project: { matchedInterview: 0 } },
            ]);

            if (!result || result.length === 0) {
                return ['No evaluation found for this interview', false, null];
            }

            const data = result[0];

            const dto: GetInterviewEvaluationDto = {
                evaluationId: data._id.toString(),
                status: data.status,
                recommendation: data.recommendation,
                averageScore: data.averageScore,
                averageConfidence: data.averageConfidence,
                overallSummary: data.overallSummary,
                evaluatedAt: data.evaluatedAt,
                results: (data.results ?? []).map((r: any) => ({
                    checklistId: r.checklistId?.toString(),
                    criterion: r.criterion,
                    category: r.category,
                    score: r.score,
                    justification: r.justification,
                    evidence: r.evidence ?? [],
                    confidence: r.confidence,
                })),
            };

            return ['Success', true, dto];
        } catch (error) {
            return [error.message, false, null];
        }
    }
}
