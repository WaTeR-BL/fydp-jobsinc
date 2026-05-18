import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    ApplicantInterview,
    ApplicantInterviewDocument,
    ApplicantJobFeedback,
    ApplicantJobFeedbackDocument,
    Domain,
    DomainDocument,
    Job,
    JobDocument,
    Tenant,
    User,
    UserDocument,
} from '@app/common';
import { AggregatePaginateModel, Model, Types } from 'mongoose';
import {
    ChartDataPointDto,
    DashboardDataDto,
    HealthMetricDto,
    OperationalHealthDto,
    RecentJobDto,
    SlaAdherenceDto,
    StatsDto,
    WeeklyApplicantFlowDto,
} from './dto/dashboard.dto';
import { InterviewStatus, JobStatus } from '@app/common/enums/app.enums';
import { getEnumText } from '@app/common/enums/enum.helper';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONGO_DOW: number[] = [2, 3, 4, 5, 6, 7, 1];

const DEFAULT_SLA_DAYS = 5;

@Injectable()
export class DashboardService {
    constructor(
        @InjectModel(Job.name)
        private readonly jobModel: AggregatePaginateModel<JobDocument>,
        @InjectModel(Domain.name)
        private readonly domainModel: AggregatePaginateModel<DomainDocument>,
        @InjectModel(User.name)
        private readonly userModel: AggregatePaginateModel<UserDocument>,
        @InjectModel(ApplicantJobFeedback.name)
        private readonly feedbackModel: AggregatePaginateModel<ApplicantJobFeedbackDocument>,
        @InjectModel(ApplicantInterview.name)
        private readonly interviewModel: AggregatePaginateModel<ApplicantInterviewDocument>,
        @InjectModel(Tenant.name)
        private readonly tenantModel: Model<Tenant>,
    ) {}

    async getDashboardData(
        tenantId: string,
    ): Promise<[string, boolean, DashboardDataDto]> {
        try {
            const tenant = await this.tenantModel
                .findById(tenantId)
                .select('slaDays')
                .lean();
            const slaDays = tenant?.slaDays ?? DEFAULT_SLA_DAYS;

            const [stats, weeklyApplicantFlow, operationalHealth, recentJobs] =
                await Promise.all([
                    this.getStats(tenantId),
                    this.getWeeklyApplicantFlow(tenantId),
                    this.getOperationalHealth(tenantId, slaDays),
                    this.getRecentJobs(tenantId),
                ]);

            return [
                'Success',
                true,
                { stats, weeklyApplicantFlow, operationalHealth, recentJobs },
            ];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    private getDateRanges() {
        const now = new Date();

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        // Monday of current week
        const startOfWeek = new Date(now);
        const dow = now.getDay();
        startOfWeek.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfWeek.getDate() - 7);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1,
        );

        return {
            startOfDay,
            startOfWeek,
            endOfWeek,
            startOfLastWeek,
            startOfMonth,
            startOfLastMonth,
        };
    }

    private calcChangePercent(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    }

    private async getStats(tenantId: string): Promise<StatsDto> {
        const tid = new Types.ObjectId(tenantId);
        const { startOfDay, startOfWeek, startOfMonth, startOfLastMonth } =
            this.getDateRanges();

        const [userResult, domainResult, jobResult] = await Promise.all([
            this.userModel.aggregate([
                { $match: { tenantId: tid, isDeleted: false, status: true } },
                {
                    $facet: {
                        total: [{ $count: 'count' }],
                        thisMonth: [
                            { $match: { createdAt: { $gte: startOfMonth } } },
                            { $count: 'count' },
                        ],
                        lastMonth: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: startOfLastMonth,
                                        $lt: startOfMonth,
                                    },
                                },
                            },
                            { $count: 'count' },
                        ],
                    },
                },
            ]),
            this.domainModel.aggregate([
                { $match: { tenantId: tid, isDeleted: false, status: true } },
                {
                    $facet: {
                        total: [{ $count: 'count' }],
                        newThisWeek: [
                            { $match: { createdAt: { $gte: startOfWeek } } },
                            { $count: 'count' },
                        ],
                    },
                },
            ]),
            this.jobModel.aggregate([
                { $match: { tenantId: tid, isDeleted: false } },
                {
                    $facet: {
                        running: [
                            { $match: { jobStatus: JobStatus.OPEN } },
                            { $count: 'count' },
                        ],
                        completedToday: [
                            {
                                $match: {
                                    jobStatus: JobStatus.CLOSED,
                                    updatedAt: { $gte: startOfDay },
                                },
                            },
                            { $count: 'count' },
                        ],
                    },
                },
            ]),
        ]);

        const totalUsers = userResult[0]?.total[0]?.count ?? 0;
        const thisMonthUsers = userResult[0]?.thisMonth[0]?.count ?? 0;
        const lastMonthUsers = userResult[0]?.lastMonth[0]?.count ?? 0;

        return {
            totalUsers: {
                count: totalUsers,
                changePercent: this.calcChangePercent(
                    thisMonthUsers,
                    lastMonthUsers,
                ),
            },
            activeDomains: {
                count: domainResult[0]?.total[0]?.count ?? 0,
                newThisWeek: domainResult[0]?.newThisWeek[0]?.count ?? 0,
            },
            runningJobs: {
                count: jobResult[0]?.running[0]?.count ?? 0,
                completedToday: jobResult[0]?.completedToday[0]?.count ?? 0,
            },
        };
    }

    private async getWeeklyApplicantFlow(
        tenantId: string,
    ): Promise<WeeklyApplicantFlowDto> {
        const tid = new Types.ObjectId(tenantId);
        const { startOfWeek, endOfWeek, startOfLastWeek } =
            this.getDateRanges();

        const [feedbackResult, interviewResult, timeToHireResult] =
            await Promise.all([
                this.feedbackModel.aggregate([
                    {
                        $match: {
                            tenantId: tid,
                            createdAt: { $gte: startOfLastWeek },
                        },
                    },
                    {
                        $facet: {
                            chartData: [
                                {
                                    $match: {
                                        createdAt: {
                                            $gte: startOfWeek,
                                            $lt: endOfWeek,
                                        },
                                    },
                                },
                                {
                                    $group: {
                                        _id: { $dayOfWeek: '$createdAt' },
                                        count: { $sum: 1 },
                                    },
                                },
                            ],
                            thisWeek: [
                                {
                                    $match: {
                                        createdAt: {
                                            $gte: startOfWeek,
                                            $lt: endOfWeek,
                                        },
                                    },
                                },
                                { $count: 'count' },
                            ],
                            lastWeek: [
                                {
                                    $match: {
                                        createdAt: {
                                            $gte: startOfLastWeek,
                                            $lt: startOfWeek,
                                        },
                                    },
                                },
                                { $count: 'count' },
                            ],
                        },
                    },
                ]),
                this.interviewModel.aggregate([
                    {
                        $match: {
                            tenantId: tid,
                            status: { $ne: InterviewStatus.CANCELLED },
                            scheduledAt: { $gte: startOfLastWeek },
                        },
                    },
                    {
                        $facet: {
                            thisWeek: [
                                {
                                    $match: {
                                        scheduledAt: {
                                            $gte: startOfWeek,
                                            $lt: endOfWeek,
                                        },
                                    },
                                },
                                { $count: 'count' },
                            ],
                            lastWeek: [
                                {
                                    $match: {
                                        scheduledAt: {
                                            $gte: startOfLastWeek,
                                            $lt: startOfWeek,
                                        },
                                    },
                                },
                                { $count: 'count' },
                            ],
                        },
                    },
                ]),
                this.feedbackModel.aggregate([
                    { $match: { tenantId: tid, isHired: true } },
                    {
                        $facet: {
                            thisWeek: [
                                {
                                    $match: {
                                        updatedAt: {
                                            $gte: startOfWeek,
                                            $lt: endOfWeek,
                                        },
                                    },
                                },
                                {
                                    $project: {
                                        days: {
                                            $divide: [
                                                {
                                                    $subtract: [
                                                        '$updatedAt',
                                                        '$createdAt',
                                                    ],
                                                },
                                                86400000,
                                            ],
                                        },
                                    },
                                },
                                { $group: { _id: null, avg: { $avg: '$days' } } },
                            ],
                            lastWeek: [
                                {
                                    $match: {
                                        updatedAt: {
                                            $gte: startOfLastWeek,
                                            $lt: startOfWeek,
                                        },
                                    },
                                },
                                {
                                    $project: {
                                        days: {
                                            $divide: [
                                                {
                                                    $subtract: [
                                                        '$updatedAt',
                                                        '$createdAt',
                                                    ],
                                                },
                                                86400000,
                                            ],
                                        },
                                    },
                                },
                                { $group: { _id: null, avg: { $avg: '$days' } } },
                            ],
                        },
                    },
                ]),
            ]);

        // Map MongoDB $dayOfWeek values to Mon–Sun order, filling zeros for missing days
        const rawChart: { _id: number; count: number }[] =
            feedbackResult[0]?.chartData ?? [];
        const dayMap = new Map<number, number>(
            rawChart.map((d) => [d._id, d.count]),
        );
        const chartData: ChartDataPointDto[] = DAY_NAMES.map((day, idx) => ({
            day,
            count: dayMap.get(MONGO_DOW[idx]) ?? 0,
        }));

        const thisWeekApplicants =
            feedbackResult[0]?.thisWeek[0]?.count ?? 0;
        const lastWeekApplicants =
            feedbackResult[0]?.lastWeek[0]?.count ?? 0;
        const thisWeekInterviews =
            interviewResult[0]?.thisWeek[0]?.count ?? 0;
        const lastWeekInterviews =
            interviewResult[0]?.lastWeek[0]?.count ?? 0;
        const thisAvgDays: number =
            timeToHireResult[0]?.thisWeek[0]?.avg ?? 0;
        const lastAvgDays: number =
            timeToHireResult[0]?.lastWeek[0]?.avg ?? 0;

        return {
            chartData,
            applicantsProcessed: {
                count: thisWeekApplicants,
                changePercent: this.calcChangePercent(
                    thisWeekApplicants,
                    lastWeekApplicants,
                ),
            },
            interviewsThisWeek: {
                count: thisWeekInterviews,
                changePercent: this.calcChangePercent(
                    thisWeekInterviews,
                    lastWeekInterviews,
                ),
            },
            avgTimeToHire: {
                days: Math.round(thisAvgDays * 10) / 10,
                changeDays: Math.round((thisAvgDays - lastAvgDays) * 10) / 10,
            },
        };
    }

    private async getOperationalHealth(
        tenantId: string,
        slaDays: number,
    ): Promise<OperationalHealthDto> {
        const tid = new Types.ObjectId(tenantId);
        const { startOfWeek, endOfWeek, startOfLastWeek } =
            this.getDateRanges();

        const [completionResult, responseResult] = await Promise.all([
            this.feedbackModel.aggregate([
                {
                    $match: {
                        tenantId: tid,
                        createdAt: { $gte: startOfLastWeek },
                    },
                },
                {
                    $facet: {
                        thisWeek: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: startOfWeek,
                                        $lt: endOfWeek,
                                    },
                                },
                            },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: 1 },
                                    completed: {
                                        $sum: {
                                            $cond: [
                                                '$isProcessCompleted',
                                                1,
                                                0,
                                            ],
                                        },
                                    },
                                },
                            },
                        ],
                        lastWeek: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: startOfLastWeek,
                                        $lt: startOfWeek,
                                    },
                                },
                            },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: 1 },
                                    completed: {
                                        $sum: {
                                            $cond: [
                                                '$isProcessCompleted',
                                                1,
                                                0,
                                            ],
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            ]),
            this.interviewModel.aggregate([
                {
                    $match: {
                        tenantId: tid,
                        status: { $ne: InterviewStatus.CANCELLED },
                        createdAt: { $gte: startOfLastWeek },
                    },
                },
                {
                    $lookup: {
                        from: 'applicantJobFeedbacks',
                        localField: 'applicantJobFeedbackId',
                        foreignField: '_id',
                        as: 'feedback',
                    },
                },
                { $unwind: '$feedback' },
                {
                    $project: {
                        createdAt: 1,
                        responseDays: {
                            $divide: [
                                {
                                    $subtract: [
                                        '$createdAt',
                                        '$feedback.createdAt',
                                    ],
                                },
                                86400000,
                            ],
                        },
                    },
                },
                {
                    $facet: {
                        thisWeek: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: startOfWeek,
                                        $lt: endOfWeek,
                                    },
                                },
                            },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: 1 },
                                    withinSla: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $lte: [
                                                        '$responseDays',
                                                        slaDays,
                                                    ],
                                                },
                                                1,
                                                0,
                                            ],
                                        },
                                    },
                                    avgDays: { $avg: '$responseDays' },
                                },
                            },
                        ],
                        lastWeek: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: startOfLastWeek,
                                        $lt: startOfWeek,
                                    },
                                },
                            },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: 1 },
                                    withinSla: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $lte: [
                                                        '$responseDays',
                                                        slaDays,
                                                    ],
                                                },
                                                1,
                                                0,
                                            ],
                                        },
                                    },
                                    avgDays: { $avg: '$responseDays' },
                                },
                            },
                        ],
                    },
                },
            ]),
        ]);

        const thisComp = completionResult[0]?.thisWeek[0];
        const lastComp = completionResult[0]?.lastWeek[0];
        const thisCompRate =
            thisComp?.total > 0
                ? (thisComp.completed / thisComp.total) * 100
                : 0;
        const lastCompRate =
            lastComp?.total > 0
                ? (lastComp.completed / lastComp.total) * 100
                : 0;

        const completionRate: HealthMetricDto = {
            value: Math.round(thisCompRate * 10) / 10,
            change: Math.round((thisCompRate - lastCompRate) * 10) / 10,
        };

        const thisResp = responseResult[0]?.thisWeek[0];
        const lastResp = responseResult[0]?.lastWeek[0];
        const thisAvgDays: number = thisResp?.avgDays ?? 0;
        const lastAvgDays: number = lastResp?.avgDays ?? 0;

        const avgResponseDays: HealthMetricDto = {
            value: Math.round(thisAvgDays * 10) / 10,
            change: Math.round((thisAvgDays - lastAvgDays) * 10) / 10,
        };

        const thisSla =
            thisResp?.total > 0
                ? (thisResp.withinSla / thisResp.total) * 100
                : 100;
        const lastSla =
            lastResp?.total > 0
                ? (lastResp.withinSla / lastResp.total) * 100
                : 100;

        const slaAdherence: SlaAdherenceDto = {
            value: Math.round(thisSla * 10) / 10,
            change: Math.round((thisSla - lastSla) * 10) / 10,
            status: thisSla >= 95 ? 'Stable' : thisSla >= 80 ? 'At Risk' : 'Breached',
        };

        return { completionRate, avgResponseDays, slaAdherence };
    }

    private async getRecentJobs(tenantId: string): Promise<RecentJobDto[]> {
        const tid = new Types.ObjectId(tenantId);

        const result = await this.jobModel.aggregate([
            { $match: { tenantId: tid, isDeleted: false } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'domains',
                    localField: 'domainId',
                    foreignField: '_id',
                    as: 'domain',
                },
            },
            {
                $unwind: {
                    path: '$domain',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'applicantJobFeedbacks',
                    let: {
                        jobId: '$_id',
                        pipelineLength: {
                            $size: { $ifNull: ['$interviewPipeline', []] },
                        },
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$jobId', '$$jobId'] },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                avgProgress: {
                                    $avg: {
                                        $cond: [
                                            { $gt: ['$$pipelineLength', 0] },
                                            {
                                                $multiply: [
                                                    {
                                                        $divide: [
                                                            '$totalRoundsCompleted',
                                                            '$$pipelineLength',
                                                        ],
                                                    },
                                                    100,
                                                ],
                                            },
                                            0,
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                    as: 'applicantStats',
                },
            },
            {
                $project: {
                    _id: 0,
                    title: 1,
                    domain: { $ifNull: ['$domain.title', ''] },
                    status: '$jobStatus',
                    progress: {
                        $round: [
                            {
                                $ifNull: [
                                    {
                                        $arrayElemAt: [
                                            '$applicantStats.avgProgress',
                                            0,
                                        ],
                                    },
                                    0,
                                ],
                            },
                            0,
                        ],
                    },
                },
            },
        ]);

        return result.map((job) => ({
            ...job,
            status: getEnumText(job.status, JobStatus),
        }));
    }
}
