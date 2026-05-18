import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    ApplicantJobFeedback,
    Job,
    Subscription,
    Tenant,
    User,
    UserDocument,
} from '@app/common';
import { AggregatePaginateModel, Model, Types } from 'mongoose';
import {
    AdminDashboardDto,
    AdminUserDto,
    CreateAdminUserDto,
    TenantDetailDto,
    TenantFilterDto,
    TenantListItemDto,
    TenantSubscriptionInfoDto,
    ToggleWhatsappManagedDto,
    UpdateAdminUserStatusDto,
    UpdateBusinessIdDto,
    UpdateTenantStatusDto,
} from './dto/admin.dto';
import { AuthProvider, JobStatus, SubscriptionStatus, UserRole } from '@app/common/enums/app.enums';
import { PaginatedData } from '../common/pagination/paginated-data.pagination';
import { getEnumText } from '@app/common/enums/enum.helper';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(Tenant.name)
        private readonly tenantModel: Model<Tenant>,
        @InjectModel(User.name)
        private readonly userModel: AggregatePaginateModel<UserDocument>,
        @InjectModel(Job.name)
        private readonly jobModel: Model<Job>,
        @InjectModel(ApplicantJobFeedback.name)
        private readonly feedbackModel: Model<ApplicantJobFeedback>,
        @InjectModel(Subscription.name)
        private readonly subscriptionModel: Model<Subscription>,
        private readonly emailService: EmailService,
    ) {}

    async getPlatformDashboard(): Promise<[string, boolean, AdminDashboardDto]> {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

            const [tenantResult, totalUsers, totalActiveJobs, totalApplicants, activeSubscriptions, growthResult] =
                await Promise.all([
                    this.tenantModel.aggregate([
                        {
                            $facet: {
                                total: [{ $count: 'count' }],
                                active: [{ $match: { status: true } }, { $count: 'count' }],
                                inactive: [{ $match: { status: false } }, { $count: 'count' }],
                                newThisMonth: [
                                    { $match: { createdAt: { $gte: startOfMonth } } },
                                    { $count: 'count' },
                                ],
                            },
                        },
                    ]),
                    this.userModel.countDocuments({ isDeleted: false }),
                    this.jobModel.countDocuments({ jobStatus: JobStatus.OPEN, isDeleted: false }),
                    this.feedbackModel.countDocuments({}),
                    this.subscriptionModel.countDocuments({ status: SubscriptionStatus.ACTIVE }),
                    this.tenantModel.aggregate([
                        { $match: { createdAt: { $gte: twelveMonthsAgo } } },
                        {
                            $group: {
                                _id: {
                                    year: { $year: '$createdAt' },
                                    month: { $month: '$createdAt' },
                                },
                                count: { $sum: 1 },
                            },
                        },
                        { $sort: { '_id.year': 1, '_id.month': 1 } },
                    ]),
                ]);

            const tr = tenantResult[0];
            const tenantGrowthChart = growthResult.map((g: any) => ({
                month: new Date(g._id.year, g._id.month - 1, 1).toLocaleString('default', {
                    month: 'short',
                    year: 'numeric',
                }),
                count: g.count,
            }));

            return [
                'Success',
                true,
                {
                    tenants: {
                        total: tr?.total[0]?.count ?? 0,
                        active: tr?.active[0]?.count ?? 0,
                        inactive: tr?.inactive[0]?.count ?? 0,
                        newThisMonth: tr?.newThisMonth[0]?.count ?? 0,
                    },
                    totalUsers,
                    totalActiveJobs,
                    totalApplicants,
                    activeSubscriptions,
                    tenantGrowthChart,
                },
            ];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async getTenants(
        dto: TenantFilterDto,
    ): Promise<[string, boolean, PaginatedData<TenantListItemDto>]> {
        try {
            const { page = 1, limit = 10, search, status } = dto;
            const match: Record<string, any> = {};

            if (status !== undefined) match.status = status === 'true';
            if (search) {
                match.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { domain: { $regex: search, $options: 'i' } },
                    { contactEmail: { $regex: search, $options: 'i' } },
                ];
            }

            const [docs, total] = await Promise.all([
                this.tenantModel.aggregate([
                    { $match: match },
                    { $sort: { createdAt: -1 } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: 'users',
                            let: { tid: '$_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ['$tenantId', '$$tid'] },
                                        isDeleted: false,
                                    },
                                },
                                { $count: 'count' },
                            ],
                            as: 'users',
                        },
                    },
                    {
                        $lookup: {
                            from: 'jobs',
                            let: { tid: '$_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ['$tenantId', '$$tid'] },
                                        isDeleted: false,
                                    },
                                },
                                { $count: 'count' },
                            ],
                            as: 'jobs',
                        },
                    },
                    {
                        $lookup: {
                            from: 'subscriptions',
                            localField: '_id',
                            foreignField: 'tenantId',
                            as: 'subscription',
                        },
                    },
                    {
                        $project: {
                            name: 1,
                            domain: 1,
                            contactEmail: 1,
                            status: 1,
                            createdAt: 1,
                            userCount: { $ifNull: [{ $arrayElemAt: ['$users.count', 0] }, 0] },
                            jobCount: { $ifNull: [{ $arrayElemAt: ['$jobs.count', 0] }, 0] },
                            subscriptionStatus: {
                                $ifNull: [{ $arrayElemAt: ['$subscription.status', 0] }, null],
                            },
                        },
                    },
                ]),
                this.tenantModel.countDocuments(match),
            ]);

            const items: TenantListItemDto[] = docs.map((t: any) => ({
                id: t._id.toString(),
                name: t.name,
                domain: t.domain,
                contactEmail: t.contactEmail,
                status: t.status,
                subscriptionStatus:
                    t.subscriptionStatus !== null
                        ? getEnumText(t.subscriptionStatus, SubscriptionStatus)
                        : null,
                userCount: t.userCount,
                jobCount: t.jobCount,
                createdAt: t.createdAt,
            }));

            return ['Success', true, new PaginatedData(items, total, page, limit)];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async getTenantById(
        id: string,
    ): Promise<[string, boolean, TenantDetailDto]> {
        try {
            const tid = new Types.ObjectId(id);

            const [tenantDoc, userCount, jobCount, applicantCount, subscription] = await Promise.all([
                this.tenantModel.findById(tid).lean(),
                this.userModel.countDocuments({ tenantId: tid, isDeleted: false }),
                this.jobModel.countDocuments({ tenantId: tid, isDeleted: false }),
                this.feedbackModel.countDocuments({ tenantId: tid }),
                this.subscriptionModel
                    .findOne({ tenantId: tid })
                    .sort({ createdAt: -1 })
                    .lean(),
            ]);

            if (!tenantDoc) return ['Tenant not found', false, null];

            const subInfo: TenantSubscriptionInfoDto | null = subscription
                ? {
                      status: getEnumText(subscription.status, SubscriptionStatus),
                      whatsappManagedActive: subscription.whatsappManagedActive,
                      cvUsed: subscription.cvUsed,
                      remindersUsed: subscription.remindersUsed,
                      evalBlocksUsed: subscription.evalBlocksUsed,
                      currentPeriodEnd: subscription.currentPeriodEnd ?? null,
                  }
                : null;

            const detail: TenantDetailDto = {
                id: tenantDoc['_id'].toString(),
                name: tenantDoc.name,
                domain: tenantDoc.domain,
                contactEmail: tenantDoc.contactEmail,
                logoUrl: tenantDoc.logoUrl ?? null,
                websiteUrl: tenantDoc.websiteUrl,
                address: tenantDoc.address ?? null,
                status: tenantDoc.status,
                slaDays: tenantDoc.slaDays ?? 5,
                businessId: tenantDoc.businessId ?? null,
                userCount,
                jobCount,
                applicantCount,
                createdAt: tenantDoc['createdAt'],
                subscription: subInfo,
            };

            return ['Success', true, detail];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async updateTenantStatus(
        id: string,
        dto: UpdateTenantStatusDto,
    ): Promise<[string, boolean]> {
        try {
            const tenant = await this.tenantModel
                .findById(id)
                .select('name contactEmail status')
                .lean();
            if (!tenant) return ['Tenant not found', false];

            const result = await this.tenantModel.updateOne(
                { _id: id },
                { $set: { status: dto.status } },
            );
            if (result.matchedCount === 0) return ['Tenant not found', false];

            if (!dto.status) {
                const subject = 'Your JobsInc account has been deactivated';
                const html = this.buildDeactivationEmail(tenant.name, dto.reason);
                await this.emailService.sendDirectEmail(
                    tenant.contactEmail,
                    'Jobsinc',
                    subject,
                    html,
                );
            }

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async updateTenantBusinessId(
        id: string,
        dto: UpdateBusinessIdDto,
    ): Promise<[string, boolean]> {
        try {
            const result = await this.tenantModel.updateOne(
                { _id: id },
                { $set: { businessId: dto.businessId } },
            );
            if (result.matchedCount === 0) return ['Tenant not found', false];
            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async toggleWhatsappManaged(
        id: string,
        dto: ToggleWhatsappManagedDto,
    ): Promise<[string, boolean]> {
        try {
            const result = await this.subscriptionModel.updateOne(
                { tenantId: new Types.ObjectId(id), status: SubscriptionStatus.ACTIVE },
                { $set: { whatsappManagedActive: dto.active } },
            );
            if (result.matchedCount === 0) return ['Active subscription not found', false];
            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async getAdminUsers(): Promise<[string, boolean, AdminUserDto[]]> {
        try {
            const users = await this.userModel
                .find({ roles: UserRole.SUPER_ADMIN, isDeleted: false })
                .select('name emailAddress status createdAt')
                .sort({ createdAt: -1 })
                .lean();

            const data: AdminUserDto[] = users.map((u: any) => ({
                id: u._id.toString(),
                name: u.name,
                emailAddress: u.emailAddress,
                status: u.status,
                createdAt: u.createdAt,
            }));

            return ['Success', true, data];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async createAdminUser(
        dto: CreateAdminUserDto,
    ): Promise<[string, boolean]> {
        try {
            const existing = await this.userModel.findOne({
                emailAddress: dto.emailAddress,
            });
            if (existing) return ['Email address already in use', false];

            const password = await bcrypt.hash(dto.password, 10);
            await this.userModel.create({
                emailAddress: dto.emailAddress,
                name: dto.name,
                roles: [UserRole.SUPER_ADMIN],
                authProvider: AuthProvider.LOCAL,
                password,
                timezone: dto.timezone,
                enable2FA: false,
                status: true,
                isDeleted: false,
            });

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async updateAdminUserStatus(
        id: string,
        dto: UpdateAdminUserStatusDto,
        requesterId: string,
    ): Promise<[string, boolean]> {
        try {
            if (id === requesterId) return ['Cannot change your own status', false];

            const result = await this.userModel.updateOne(
                { _id: new Types.ObjectId(id), roles: UserRole.SUPER_ADMIN },
                { $set: { status: dto.status } },
            );
            if (result.matchedCount === 0) return ['Admin user not found', false];
            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    private buildDeactivationEmail(tenantName: string, reason?: string): string {
        const reasonSection = reason
            ? `<p><strong>Reason:</strong> ${reason}</p>`
            : '';
        return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#e53e3e;">Account Deactivated</h2>
  <p>Dear ${tenantName},</p>
  <p>Your JobsInc account has been deactivated by the administrator.</p>
  ${reasonSection}
  <p>If you believe this is a mistake or have questions, please contact our support team.</p>
  <p style="margin-top:32px;">Best regards,<br><strong>JobsInc Team</strong></p>
</div>`;
    }
}
