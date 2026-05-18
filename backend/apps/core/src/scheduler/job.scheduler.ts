import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job, JobDocument } from '@app/common';
import { AggregatePaginateModel } from 'mongoose';
import { AgendaService } from '../agenda/agenda.service';
import { JobStatus } from '@app/common/enums/app.enums';
import { JobPostingQueue } from '../job-posting/job-posting-queue/job-posting.queue';
import { UploadedMedia } from '../job-posting/interface/linkedin.interface';
import { DateTime } from 'luxon';
import { toUtc } from '../common/helper/timezone-handler.helper';

@Injectable()
export class JobSchedulerService implements OnModuleInit {
    private readonly START_JOB_NAME = 'change-status-to-start';
    private readonly END_JOB_NAME = 'change-status-to-end';

    constructor(
        @InjectModel(Job.name)
        private readonly jobModel: AggregatePaginateModel<JobDocument>,
        private readonly agendaService: AgendaService,
        private readonly jobPostingQueue: JobPostingQueue,
    ) {}

    async onModuleInit() {
        await this.defineAgendaJobs();
        await this.scheduleExistingJobs();
    }

    private async defineAgendaJobs() {
        const agenda = this.agendaService.getAgenda();

        agenda.define(
            this.START_JOB_NAME,
            { priority: 10, concurrency: 10 },
            async (rec) => {
                const { jobId } = rec.attrs.data;
                try {
                    const result = await this.jobModel.findOneAndUpdate(
                        {
                            _id: jobId,
                            startDate: { $ne: null },
                            jobStatus: JobStatus.DRAFT,
                        },
                        {
                            $set: { jobStatus: JobStatus.OPEN },
                            $unset: { startScheduledJobId: null },
                        },
                        {
                            new: true,
                        },
                    );

                    if (result.enableJobPosting) {
                        const [tz] = await this.jobModel.aggregate([
                            {
                                $match: { _id: result._id },
                            },
                            {
                                $lookup: {
                                    from: 'users',
                                    let: { createdByStr: '$createdBy' },
                                    pipeline: [
                                        {
                                            $addFields: {
                                                _idStr: { $toString: '$_id' },
                                            },
                                        },
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: [
                                                        '$_idStr',
                                                        '$$createdByStr',
                                                    ],
                                                },
                                            },
                                        },
                                        {
                                            $project: { timezone: 1, _id: 0 },
                                        },
                                    ],
                                    as: 'creator',
                                },
                            },
                            {
                                $unwind: {
                                    path: '$creator',
                                    preserveNullAndEmptyArrays: true,
                                },
                            },
                            {
                                $project: {
                                    'creator.timezone': 1,
                                },
                            },
                        ]);

                        const media: UploadedMedia[] =
                            result?.postData?.media?.length > 0
                                ? result.postData.media.map((item) => ({
                                      asset: item.asset,
                                      title: item.title,
                                      description: item.description,
                                      status: item.status,
                                  }))
                                : [];

                        await this.jobPostingQueue.add('linkedin-post-job', {
                            tenantId: result.tenantId.toString(),
                            targetUrns: result.postData.targetUrns,
                            visibility: result.postData.visibility,
                            text: result.postData.text,
                            media: media,
                            jobId: result._id.toString(),
                            timezone: tz?.timezone,
                        });
                    }

                    if (!result)
                        console.log('error while updating job status to open');
                } catch (err) {
                    console.log('error while updating job status to open', err);
                }
            },
        );

        agenda.define(
            this.END_JOB_NAME,
            { priority: 10, concurrency: 10 },
            async (rec) => {
                const { jobId } = rec.attrs.data;
                try {
                    const result = await this.jobModel.updateOne(
                        {
                            _id: jobId,
                            endDate: { $ne: null },
                            jobStatus: JobStatus.OPEN,
                        },
                        {
                            $set: { jobStatus: JobStatus.CLOSED },
                            $unset: { endScheduledJobId: null },
                        },
                    );

                    if (result.modifiedCount == 0)
                        console.log(
                            'error while updating job status to closed',
                        );
                } catch (err) {
                    console.log(
                        'error while updating job status to closed',
                        err,
                    );
                }
            },
        );
    }

    async scheduleJob(job: JobDocument, timezone: string): Promise<void> {
        const now = toUtc(DateTime.now().toISO(), timezone);
        const start = job.startDate != null ? new Date(job.startDate) : null;
        const end = job.endDate != null ? new Date(job.endDate) : null;

        if (start != null && start > now && job.jobStatus === JobStatus.DRAFT) {
            const scheduleStart = await this.agendaService.scheduleJob(
                this.START_JOB_NAME,
                start,
                {
                    jobId: job._id.toString(),
                },
            );

            await this.jobModel.updateOne(
                {
                    _id: job._id,
                },
                {
                    $set: {
                        startScheduledJobId: scheduleStart.attrs._id.toString(),
                    },
                },
            );

            if (end != null && end > now) {
                const scheduleEnd = await this.agendaService.scheduleJob(
                    this.END_JOB_NAME,
                    end,
                    {
                        jobId: job._id.toString(),
                    },
                );

                await this.jobModel.updateOne(
                    {
                        _id: job._id,
                    },
                    {
                        $set: {
                            endScheduledJobId: scheduleEnd.attrs._id.toString(),
                        },
                    },
                );
            }
        }
    }

    async cancelScheduledJob(jobId: string): Promise<void> {
        const job = await this.jobModel.findById(jobId);
        if (job.startScheduledJobId)
            await this.agendaService.cancelJob(job.startScheduledJobId);

        if (job.endScheduledJobId)
            await this.agendaService.cancelJob(job.endScheduledJobId);

        await this.jobModel.updateOne(
            {
                _id: jobId,
            },
            {
                $unset: { startScheduledJobId: null, endScheduledJobId: null },
            },
        );
    }

    async rescheduleJob(jobId: string, timezone: string): Promise<void> {
        const job = await this.jobModel.findById(jobId);

        await this.cancelScheduledJob(jobId);

        await this.scheduleJob(job, timezone);
    }

    private async scheduleExistingJobs(): Promise<void> {
        try {
            const nowUtc = new Date();

            const draftJobsPipeline = [
                {
                    $match: {
                        jobStatus: JobStatus.DRAFT,
                        startDate: { $ne: null },
                        startScheduledJobId: { $exists: false },
                    },
                },
                {
                    $addFields: {
                        nowInJobTZ: {
                            $dateFromString: {
                                dateString: {
                                    $dateToString: {
                                        date: nowUtc,
                                        timezone: '$timezone',
                                    },
                                },
                            },
                        },
                    },
                },
                {
                    $match: {
                        $expr: { $gt: ['$startDate', '$nowInJobTZ'] },
                    },
                },
            ];

            const draftJobs = await this.jobModel
                .aggregate(draftJobsPipeline)
                .exec();

            for (const job of draftJobs) {
                const startSchedule = await this.agendaService.scheduleJob(
                    this.START_JOB_NAME,
                    job.startDate,
                    { jobId: job._id.toString() },
                );

                await this.jobModel.updateOne(
                    { _id: job._id },
                    {
                        $set: {
                            startScheduledJobId:
                                startSchedule.attrs._id.toString(),
                        },
                    },
                );
            }

            const openJobsPipeline = [
                {
                    $match: {
                        jobStatus: JobStatus.OPEN,
                        endDate: { $ne: null },
                        endScheduledJobId: { $exists: false },
                    },
                },
                {
                    $addFields: {
                        nowInJobTZ: {
                            $dateFromString: {
                                dateString: {
                                    $dateToString: {
                                        date: nowUtc,
                                        timezone: '$timezone',
                                    },
                                },
                            },
                        },
                    },
                },
                {
                    $match: {
                        $expr: { $gt: ['$endDate', '$nowInJobTZ'] },
                    },
                },
            ];

            const openJobs = await this.jobModel
                .aggregate(openJobsPipeline)
                .exec();

            for (const job of openJobs) {
                const endSchedule = await this.agendaService.scheduleJob(
                    this.END_JOB_NAME,
                    job.endDate,
                    { jobId: job._id.toString() },
                );

                await this.jobModel.updateOne(
                    { _id: job._id },
                    {
                        $set: {
                            endScheduledJobId: endSchedule.attrs._id.toString(),
                        },
                    },
                );
            }
        } catch (err) {
            console.error('rescheduling existing jobs', err);
        }
    }
}
