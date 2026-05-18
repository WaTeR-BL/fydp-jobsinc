import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    CreateInterviewRoundConfigDto,
    CreateJobDto,
    CreateMetricDto,
    GetAllJobDto,
    GetJobDto,
    JobFilterDto,
    UpdateInterviewRoundConfigDto,
    UpdateJobDto,
    UpdateMetricDto,
    UpdatePostDataDto,
} from './dto/job.dto';
import { MediaManagerService } from '@app/common/media-manager/media-manager.service';
import { PaginatedData } from '../common/pagination/paginated-data.pagination';
import mongoose, { AggregatePaginateModel, Types } from 'mongoose';
import { MetricInterface } from '@app/common/interface/metric.interface';
import {
    Job,
    JobDocument,
    RMQ_CONSTANTS,
    Tenant,
    sendWithTimeout,
} from '@app/common';
import {
    GetJobDocument,
    JobPostData,
    UpdateJobLinkedInData,
} from './interface/job.interface';
import { ApplicationChannel, JobStatus } from '@app/common/enums/app.enums';
import { JobSchedulerService } from '../scheduler/job.scheduler';
import { getEnumText } from '@app/common/enums/enum.helper';
import { LinkedInPostInfo } from '@app/common/schemas/linkedin-post-info.schema';
import { LinkedInPostFailure } from '@app/common/schemas/linkedin-post-failure.schema';
import { ClientProxy } from '@nestjs/microservices';
import { toLocal, toUtc } from '../common/helper/timezone-handler.helper';
import { DateTime } from 'luxon';
import {
    MailboxConfig,
    MailboxConfigDocument,
} from '@app/common/schemas/mailbox-config.schema';
import { Model } from 'mongoose';
import { MailEncryptionService } from '../mail-ingestion/services/mail-encryption.service';

@Injectable()
export class JobService {
    constructor(
        @InjectModel(Job.name)
        private readonly jobModel: AggregatePaginateModel<JobDocument>,
        @InjectModel(Tenant.name)
        private readonly tenantModel: mongoose.Model<Tenant>,
        @InjectModel(MailboxConfig.name)
        private readonly mailboxConfigModel: Model<MailboxConfigDocument>,
        @Inject(RMQ_CONSTANTS.AI.name) private readonly aiClient: ClientProxy,
        private readonly mediaService: MediaManagerService,
        private readonly mailEncryption: MailEncryptionService,
        private jobSchedulerService: JobSchedulerService,
    ) {}

    async savePostData(jobId: string, data: JobPostData): Promise<void> {
        try {
            const post: JobPostData = {
                tenantId: data.tenantId,
                text: data.text ?? null,
                visibility: data.visibility,
                targetUrns: data.targetUrns,
                media:
                    data.media?.map((m) => ({
                        asset: m.asset,
                        status: m.status,
                        title: m.title,
                        description: m.description,
                    })) ?? [],
            };

            await this.jobModel.updateOne(
                {
                    _id: new Types.ObjectId(jobId),
                    isDeleted: false,
                },
                {
                    $set: {
                        postData: post,
                        enableJobPosting: true,
                    },
                },
            );
        } catch {}
    }

    private validateTime(timezone: string, start?: Date, end?: Date): void {
        const now = toUtc(DateTime.now().toISO(), timezone);
        const minDate = toUtc(DateTime.now().toISO(), timezone);
        minDate.setDate(minDate.getDate() + 1);
        minDate.setHours(0, 0, 0, 0);

        if (start && end && start >= end) {
            throw new Error('Start time must be before end time');
        }

        if (start && start < now) {
            throw new Error('Start time cannot be in the past');
        }

        if ((start && start < minDate) || (end && end < minDate)) {
            throw new Error(
                `Start time and end time must be greater than or equal to ${minDate.toISOString()}`,
            );
        }
    }

    async create(
        dto: CreateJobDto,
        file: Express.Multer.File,
        tenantId: string,
        timezone: string,
        userId?: string,
    ): Promise<[string, boolean, string]> {
        try {
            let startDate: Date = null;
            let endDate: Date = null;

            if (dto.start) startDate = toUtc(dto.start, timezone);

            if (dto.end) endDate = toUtc(dto.end, timezone);

            if (dto.jobStatus == JobStatus.OPEN && !dto.end) {
                return [
                    'end date is required when job status is OPEN',
                    false,
                    null,
                ];
            } else if (dto.jobStatus == JobStatus.OPEN) {
                startDate = toUtc(DateTime.now().toISO(), timezone);
            }

            if (dto.jobStatus == JobStatus.DRAFT) {
                this.validateTime(timezone, startDate, endDate);
            }

            if (!file.originalname.endsWith('.pdf')) {
                return ['Please upload pdf', false, null];
            }

            const [msg, ok, fileInfo] = await this.mediaService.upload(file);
            if (!ok) {
                return [msg, false, null];
            }

            const job = new this.jobModel({
                title: dto.title,
                filename: fileInfo.filename,
                filepath: fileInfo.filepath,
                url: fileInfo.url,
                jobStatus: dto.jobStatus,
                startDate: startDate,
                endDate: endDate,
                domainId: dto.domainId,
                createdBy: userId,
                timezone: timezone,
                jobVerificationCode: dto.jobVerificationCode,
                applicationChannels: dto.applicationChannels,
                tenantId,
                metrics: dto.metrics.map(({ title, description, status }) => ({
                    title,
                    description,
                    status,
                })),
                interviewPipeline:
                    dto.interviewPipeline?.map((round) =>
                        this.mapRoundConfigToDocument(round),
                    ) ?? [],
            });

            await job.save();

            await this.jobSchedulerService.scheduleJob(job, timezone);

            return ['Success', true, job._id.toString()];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async analyze(file: Express.Multer.File): Promise<[string, boolean, any]> {
        try {
            if (!file.originalname.endsWith('.pdf')) {
                return ['Please upload pdf', false, null];
            }
            const [msg, ok, fileInfo] = await this.mediaService.upload(file);
            if (!ok) {
                return [msg, false, null];
            }
            const result = await sendWithTimeout(
                this.aiClient,
                RMQ_CONSTANTS.AI.listensTo.extract_metrics,
                { url: fileInfo.url },
                60000,
            );
            return ['Success', true, result];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async generateLinkedinPost(
        file: Express.Multer.File,
        tenantId: string,
        channels: ApplicationChannel[],
        jobVerificationCode: string,
    ): Promise<[string, boolean, any]> {
        try {
            if (!file.originalname.endsWith('.pdf')) {
                return ['Please upload pdf', false, null];
            }
            const [msg, ok, fileInfo] = await this.mediaService.upload(file);
            if (!ok) {
                return [msg, false, null];
            }

            const tenant = await this.tenantModel
                .findById(tenantId)
                .select('liveContact name')
                .exec();

            const result = await sendWithTimeout<{
                content: string;
                hashtags: string[];
            }>(
                this.aiClient,
                RMQ_CONSTANTS.AI.listensTo.generate_linkedin_post,
                { url: fileInfo.url },
                60000,
            );

            let content = result.content || '';
            const ctaParts: string[] = [];

            // WhatsApp CTA
            if (
                channels.includes(ApplicationChannel.WHATSAPP) &&
                tenant?.liveContact
            ) {
                const whatsappNumber = tenant.liveContact.replace(/\D/g, '');
                const whatsappLink = `https://wa.me/${whatsappNumber}`;
                ctaParts.push(`💬 Apply via WhatsApp: ${whatsappLink}`);
            }

            // Email CTA — build tagged address from tenant mailbox config
            if (
                channels.includes(ApplicationChannel.EMAIL) &&
                jobVerificationCode
            ) {
                const mailbox = await this.mailboxConfigModel
                    .findOne({
                        tenantId: new Types.ObjectId(tenantId),
                        isVerified: true,
                        isActive: true,
                    })
                    .lean();

                if (mailbox) {
                    const [local, domain] = mailbox.imapUser.split('@');
                    const taggedEmail = `${local}+${jobVerificationCode}@${domain}`;
                    ctaParts.push(`📧 Apply via Email: ${taggedEmail}`);
                }
            }

            if (ctaParts.length > 0) {
                content = content + '\n\n' + ctaParts.join('\n');
            }

            return [
                'Success',
                true,
                {
                    content,
                    hashtags: result.hashtags || [],
                },
            ];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async updatePostData(
        jobId: string,
        tenantId: string,
        dto: UpdatePostDataDto,
    ): Promise<[string, boolean]> {
        try {
            const job = await this.jobModel.findOne({
                _id: new Types.ObjectId(jobId),
                tenantId: new Types.ObjectId(tenantId),
                jobStatus: JobStatus.DRAFT,
                isDeleted: false,
            });

            if (!job) {
                return ['Job not found or is not in draft status', false];
            }

            const update: Partial<JobPostData> = {};
            if (dto.text !== undefined) update.text = dto.text;
            if (dto.visibility !== undefined)
                update.visibility = dto.visibility;
            if (dto.targetUrns !== undefined)
                update.targetUrns = dto.targetUrns;

            await this.jobModel.updateOne(
                { _id: new Types.ObjectId(jobId) },
                {
                    $set: {
                        'postData.text': dto.text,
                        'postData.visibility': dto.visibility,
                    },
                },
            );

            return ['Post data updated', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async getAll(
        filterDto: JobFilterDto,
        tenantId: string,
        timezone: string,
    ): Promise<[string, boolean, PaginatedData<GetAllJobDto>]> {
        try {
            const { from, to, domainId, jobStatus, page, limit } = filterDto;

            const match: Record<string, any> = {
                tenantId: new Types.ObjectId(tenantId),
                isDeleted: false,
            };

            if (domainId?.length > 0) {
                match.domainId =
                    domainId.length === 1
                        ? new Types.ObjectId(domainId[0])
                        : { $in: domainId.map((id) => new Types.ObjectId(id)) };
            }

            if (typeof jobStatus === 'number') {
                match.jobStatus = jobStatus;
            }

            if (from || to) {
                const dateFilter: any = {};
                if (from) dateFilter.$gte = toUtc(from, timezone);
                if (to) dateFilter.$lte = toUtc(to, timezone);

                if (from && to) {
                    match.$and = [
                        { startDate: { $gte: toUtc(from, timezone) } },
                        { endDate: { $lte: toUtc(to, timezone) } },
                    ];
                } else if (from) {
                    match.startDate = { $gte: toUtc(from, timezone) };
                } else if (to) {
                    match.endDate = { $lte: toUtc(to, timezone) };
                }
            }

            const agg = this.jobModel.aggregate([
                { $match: match },
                {
                    $lookup: {
                        from: 'domains',
                        localField: 'domainId',
                        foreignField: '_id',
                        as: 'domain',
                        pipeline: [
                            {
                                $project: {
                                    title: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $unwind: {
                        path: '$domain',
                        preserveNullAndEmptyArrays: false,
                    },
                },
                {
                    $project: {
                        title: 1,
                        jobStatus: 1,
                        startDate: 1,
                        endDate: 1,
                        domainTitle: '$domain.title',
                        createdAt: 1,
                        updatedAt: 1,
                        linkedInStatus: 1,
                    },
                },
                { $sort: { startDate: -1 } },
            ]);

            const result = await this.jobModel.aggregatePaginate(agg, {
                page,
                limit,
                useFacet: true,
            });

            const items: GetAllJobDto[] = result.docs.map((job) => ({
                id: job._id.toString(),
                title: job.title,
                domainTitle: job.domainTitle,
                jobStatusName: getEnumText(job.jobStatus, JobStatus),
                start: toLocal(job.startDate, timezone),
                end: toLocal(job.endDate, timezone),
                linkedInStatus: job.linkedInStatus,
                createdAt: toLocal(job.createdAt, timezone),
                updatedAt: toLocal(job.updatedAt, timezone),
            }));

            const data = new PaginatedData<GetAllJobDto>(
                items,
                result.totalDocs,
                result.page,
                result.limit,
            );

            return ['Success', true, data];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async getById(
        id: string,
        tenantId: string,
        timezone: string,
    ): Promise<[string, boolean, GetJobDto | null]> {
        try {
            const jobId = new Types.ObjectId(id);
            const tenant = new Types.ObjectId(tenantId);

            const job = await this.jobModel
                .findOne({ _id: jobId, tenantId: tenant })
                .populate('domainId', 'title')
                .lean<GetJobDocument>()
                .select('-__v')
                .exec();

            if (!job) {
                return ['Job not found', false, null];
            }

            const domain = job.domainId as any;

            const result: GetJobDto = {
                id: job._id.toString(),
                title: job.title,
                filename: job.filename,
                filepath: job.filepath,
                domainId: domain?._id?.toString() || domain?.toString(),
                domainTitle: domain?.title,
                jobStatus: job.jobStatus,
                jobStatusName: getEnumText(job.jobStatus, JobStatus),
                mediaUrl: job.url,
                linkedInStatus: job.linkedInStatus,
                linkedInPostData:
                    job.linkedInPostInfo?.map(({ name, url, postedAt }) => ({
                        name: name,
                        url: url,
                        postedAt: postedAt.toISOString(),
                    })) || null,
                metrics: job.metrics?.map(
                    ({ _id, title, description, status }) => ({
                        id: _id.toString(),
                        title,
                        description,
                        status,
                    }),
                ),
                interviewPipeline:
                    job.interviewPipeline?.map((round) => ({
                        _id: round._id?.toString(),
                        roundNumber: round.roundNumber,
                        roundName: round.roundName,
                        interviewType: round.interviewType,
                        isOptional: round.isOptional,
                        defaultInterviewerId:
                            round.defaultInterviewerId?.toString() ?? null,
                        checkLists:
                            round.checkLists?.map(
                                ({
                                    _id: clId,
                                    criterion,
                                    category,
                                    scoring,
                                    enabled,
                                }) => ({
                                    id: clId?.toString(),
                                    criterion,
                                    category,
                                    scoring,
                                    enabled,
                                }),
                            ) ?? [],
                    })) ?? [],
                jobVerificationCode: job.jobVerificationCode,
                enableJobPosting: job.enableJobPosting,
                jobPostData: job.postData || null,
                start: toLocal(job.startDate, timezone),
                end: toLocal(job.endDate, timezone),
                createdAt: toLocal(job.createdAt, timezone),
                updatedAt: toLocal(job.updatedAt, timezone),
            };

            return ['Success', true, result];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async getJobMetric(
        id: string,
    ): Promise<[string, boolean, MetricInterface[]]> {
        try {
            const [result] = await this.jobModel.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(id) } },
                {
                    $project: {
                        metrics: {
                            $filter: {
                                input: '$metrics',
                                as: 'metric',
                                cond: { $eq: ['$$metric.status', true] },
                            },
                        },
                    },
                },
            ]);

            const data: MetricInterface[] = (result?.metrics || []).map(
                (metric: any) => ({
                    id: metric._id.toString(),
                    title: metric.title,
                    description: metric.description,
                }),
            );

            return ['Success', true, data] as [
                string,
                boolean,
                MetricInterface[],
            ];
        } catch (err) {
            return [err.message, false, null] as [
                string,
                boolean,
                MetricInterface[],
            ];
        }
    }

    async updateJob(
        id: string,
        dto: UpdateJobDto,
        tenantId: string,
        timezone: string,
        file?: Express.Multer.File,
        userId?: string,
    ): Promise<[string, boolean]> {
        try {
            let startDate: Date = null;
            let endDate: Date = null;

            if (dto.start) startDate = toUtc(dto.start, timezone);

            if (dto.end) endDate = toUtc(dto.end, timezone);

            if (dto.jobStatus == JobStatus.DRAFT) {
                this.validateTime(timezone, startDate, endDate);
            }

            if (file && !file.originalname.toLowerCase().endsWith('.pdf')) {
                return ['Only PDF files allowed', false];
            }

            const updateFields: any = {
                title: dto.title,
                jobStatus: dto.jobStatus,
                startDate:
                    dto.jobStatus == JobStatus.OPEN
                        ? toUtc(DateTime.now().toISO(), timezone)
                        : startDate,
                endDate: endDate,
                domainId: dto.domainId,
                updatedBy: userId,
            };

            if (dto.interviewPipeline !== undefined) {
                updateFields.interviewPipeline = dto.interviewPipeline.map(
                    (round) => this.mapRoundConfigToDocument(round),
                );
            }

            if (file) {
                const [msg, ok, fileInfo] =
                    await this.mediaService.upload(file);
                if (!ok) return [msg, false];

                updateFields.filename = fileInfo.filename;
                updateFields.filepath = fileInfo.filepath;
                updateFields.url = fileInfo.url;
            }

            const updatedJob = await this.jobModel
                .findOneAndUpdate(
                    {
                        _id: id,
                        jobStatus: JobStatus.DRAFT,
                        tenantId: tenantId,
                        isDeleted: false,
                    },
                    { $set: updateFields },
                    { new: true, runValidators: true },
                )
                .exec();

            if (!updatedJob) {
                return ['Job not found or not in draft status', false];
            }

            await this.jobSchedulerService.rescheduleJob(
                id,
                updatedJob.timezone,
            );

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async delete(
        id: string,
        tenantId: string,
        userId?: string,
    ): Promise<[string, boolean]> {
        try {
            const updatedData = await this.jobModel.findOneAndUpdate(
                {
                    _id: id,
                    tenantId: tenantId,
                },
                {
                    $set: {
                        isDeleted: true,
                        updatedBy: userId,
                    },
                },
                {
                    new: true,
                    runValidators: true,
                },
            );

            if (!updatedData) {
                return ['Job not found', false];
            }

            await this.jobSchedulerService.cancelScheduledJob(id);

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async manuallyCloseJob(
        id: string,
        tenantId: string,
        userId?: string,
    ): Promise<[string, boolean]> {
        try {
            const updatedData = await this.jobModel.findOneAndUpdate(
                {
                    _id: id,
                    tenantId: tenantId,
                    isDeleted: false,
                    jobStatus: JobStatus.OPEN,
                },
                {
                    $set: {
                        jobStatus: JobStatus.CLOSED,
                        updatedBy: userId,
                    },
                },
                {
                    new: true,
                    runValidators: true,
                },
            );

            if (!updatedData) {
                return ['Domain not found', false];
            }

            await this.jobSchedulerService.cancelScheduledJob(id);

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async addMetric(
        jobId: string,
        dto: CreateMetricDto[],
        tenantId: string,
        timezone: string,
        userId?: string,
    ): Promise<[string, boolean]> {
        try {
            const metrics = dto.map((m) => ({
                title: m.title,
                description: m.description,
                status: m.status,
            }));

            const updatedJob = await this.jobModel
                .findOneAndUpdate(
                    {
                        _id: jobId,
                        tenantId: tenantId,
                        jobStatus: JobStatus.DRAFT,
                        isDeleted: false,
                    },
                    {
                        $push: {
                            metrics: { $each: metrics },
                        },
                        $set: {
                            updatedAt: toUtc(DateTime.now().toISO(), timezone),
                            updatedBy: userId,
                        },
                    },
                    {
                        new: true,
                        runValidators: true,
                    },
                )
                .exec();

            if (!updatedJob) {
                return ['Job not found or not in draft status', false];
            }

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async updateMetric(
        jobId: string,
        dto: UpdateMetricDto[],
        tenantId: string,
        userId?: string,
    ): Promise<[string, boolean]> {
        try {
            const updateMap = new Map(dto.map((m) => [m.id, m]));

            const job = await this.jobModel
                .findOne({
                    _id: jobId,
                    tenantId: tenantId,
                    jobStatus: JobStatus.DRAFT,
                    isDeleted: false,
                })
                .exec();

            if (!job) {
                return ['Job not found or not in draft status', false];
            }

            job.metrics = job.metrics.map((metric) => {
                const metricId = metric._id.toString();
                const update = updateMap.get(metricId);

                if (update) {
                    if (update.title !== undefined) metric.title = update.title;
                    if (update.description !== undefined)
                        metric.description = update.description;
                    if (update.status !== undefined)
                        metric.status = update.status;
                }

                return metric;
            });

            job.markModified('metrics');
            job.updatedBy = userId;

            await job.save();

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    /**
     * Replace the entire interview pipeline on a draft job.
     * Called via POST :jobId/pipeline
     */
    async savePipeline(
        jobId: string,
        dto: CreateInterviewRoundConfigDto[],
        tenantId: string,
        userId?: string,
    ): Promise<[string, boolean]> {
        try {
            const pipeline = dto.map((round) =>
                this.mapRoundConfigToDocument(round),
            );

            const updatedJob = await this.jobModel
                .findOneAndUpdate(
                    {
                        _id: jobId,
                        tenantId: tenantId,
                        jobStatus: JobStatus.DRAFT,
                        isDeleted: false,
                    },
                    {
                        $set: {
                            interviewPipeline: pipeline,
                            updatedBy: userId,
                        },
                    },
                    { new: true },
                )
                .exec();

            if (!updatedJob) {
                return ['Job not found or not in draft status', false];
            }

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    /**
     * Update (replace) the entire interview pipeline on a draft job.
     * Called via PUT :jobId/pipeline
     */
    async updatePipeline(
        jobId: string,
        dto: UpdateInterviewRoundConfigDto[],
        tenantId: string,
        userId?: string,
    ): Promise<[string, boolean]> {
        try {
            const job = await this.jobModel
                .findOne({
                    _id: jobId,
                    tenantId: tenantId,
                    jobStatus: JobStatus.DRAFT,
                    isDeleted: false,
                })
                .exec();

            if (!job) {
                return ['Job not found or not in draft status', false];
            }

            job.interviewPipeline = dto.map((round) =>
                this.mapRoundConfigToDocument(round),
            );

            job.markModified('interviewPipeline');
            job.updatedBy = userId;

            await job.save();

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async updateJobLinkedInStatus(
        jobId: string,
        data: UpdateJobLinkedInData[],
        timezone: string,
    ): Promise<[string, boolean]> {
        try {
            const linkedInPost: LinkedInPostInfo[] = data.map(
                (item: UpdateJobLinkedInData): LinkedInPostInfo => ({
                    urnId: item.urnId,
                    name: item.name,
                    url: item.url,
                    postedAt: toUtc(DateTime.now().toISO(), timezone),
                }),
            );

            await this.jobModel.updateOne(
                { _id: jobId },
                {
                    $push: {
                        linkedInPostInfo: {
                            $each: linkedInPost,
                        },
                    },
                    $set: {
                        linkedInStatus: true,
                    },
                },
            );

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    /** Persist per-target failures, removing any stale entry for the same targetUrn first */
    async saveFailedLinkedInPosts(
        jobId: string,
        failures: Pick<
            LinkedInPostFailure,
            'targetUrn' | 'name' | 'reason' | 'text' | 'visibility'
        >[],
    ): Promise<void> {
        if (!failures.length) return;
        const failedUrns = failures.map((f) => f.targetUrn);
        const records: LinkedInPostFailure[] = failures.map((f) => ({
            ...f,
            failedAt: new Date(),
        }));
        await this.jobModel.updateOne(
            { _id: jobId },
            {
                // Remove stale records for the same targets, then add fresh ones
                $pull: {
                    linkedInFailedPosts: { targetUrn: { $in: failedUrns } },
                },
            },
        );
        await this.jobModel.updateOne(
            { _id: jobId },
            { $push: { linkedInFailedPosts: { $each: records } } },
        );
    }

    /** Lightweight fetch — returns only the fields needed by the retry flow */
    async getJobForRetry(
        jobId: string,
        tenantId: string,
    ): Promise<{ linkedInFailedPosts: LinkedInPostFailure[] } | null> {
        return this.jobModel
            .findOne(
                { _id: jobId, tenantId: new Types.ObjectId(tenantId) },
                { linkedInFailedPosts: 1 },
            )
            .lean() as any;
    }

    /** Remove specific targetUrns from the failed list (called after a successful retry) */
    async resolveFailedLinkedInPosts(
        jobId: string,
        resolvedUrns: string[],
    ): Promise<void> {
        if (!resolvedUrns.length) return;
        await this.jobModel.updateOne(
            { _id: jobId },
            {
                $pull: {
                    linkedInFailedPosts: { targetUrn: { $in: resolvedUrns } },
                },
            },
        );
    }

    async jobStatus(
        jobId: string,
    ): Promise<[string, boolean, JobStatus | null]> {
        try {
            const job = await this.jobModel
                .findById(jobId)
                .select('jobStatus')
                .lean<{ jobStatus: JobStatus }>();

            if (!job) {
                return ['Job not found', false, null];
            }

            return ['Success', true, job.jobStatus];
        } catch (error: any) {
            return [error.message, false, null];
        }
    }

    private mapRoundConfigToDocument(
        round: CreateInterviewRoundConfigDto | UpdateInterviewRoundConfigDto,
    ) {
        return {
            roundNumber: round.roundNumber,
            roundName: round.roundName,
            interviewType: round.interviewType,
            isOptional: round.isOptional ?? false,
            defaultInterviewerId: round.defaultInterviewerId
                ? new Types.ObjectId(round.defaultInterviewerId)
                : null,
            checkLists:
                round.checkLists?.map(
                    ({ criterion, category, scoring, enabled }) => ({
                        criterion,
                        category,
                        scoring: {
                            min: scoring.min,
                            max: scoring.max,
                            anchors: scoring.anchors,
                        },
                        enabled: enabled ?? true,
                    }),
                ) ?? [],
        };
    }
}
