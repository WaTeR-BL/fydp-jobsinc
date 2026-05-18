import { AggregatePaginateModel, Types } from 'mongoose';
import {
    NotificationDocument,
    Notification,
} from '@app/common/schemas/notification.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import {
    BroadcastNotification,
    CreateNotification,
} from './interface/notification.interface';
import { PaginatedData } from '../common/pagination/paginated-data.pagination';
import {
    GetNotificationDto,
    NotificationFilterDto,
} from './dto/notification.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
    constructor(
        @InjectModel(Notification.name)
        private notificationModel: AggregatePaginateModel<NotificationDocument>,
        private notificationGateway: NotificationGateway,
    ) {}

    async create(body: CreateNotification): Promise<void> {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const notification = new this.notificationModel({
            title: body.title,
            message: body.message,
            tenantId: body.tenantId,
            userId: body.userId,
            data: body.data,
            expiresAt: expiresAt,
        });

        const saved = await notification.save();

        this.notificationGateway.sendNotificationToUser(
            body.tenantId,
            body.userId,
            saved,
        );
    }

    async broadcast(body: BroadcastNotification): Promise<void> {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const userIds = body.userIds;

        if (!userIds || userIds.length === 0) {
            throw new Error(
                'userIds required or implement tenant-wide broadcast',
            );
        }

        const notifications = userIds.map((userId) => ({
            tenantId: body.tenantId,
            userId,
            title: body.title,
            message: body.message,
            data: body.data || {},
            expiresAt: expiresAt,
        }));

        const saved = await this.notificationModel.insertMany(notifications);

        saved.forEach((notification) => {
            this.notificationGateway.sendNotificationToUser(
                notification.tenantId,
                notification.userId,
                notification,
            );
        });
    }

    async broadcastToTenant(
        tenantId: string,
        body: Omit<BroadcastNotification, 'tenantId'>,
    ): Promise<void> {
        this.notificationGateway.broadcastToTenant(tenantId, {
            title: body.title,
            message: body.message,
            data: body.data,
        });
    }

    async findByUser(
        tenantId: string,
        userId: string,
        filterDto: NotificationFilterDto,
    ): Promise<[string, boolean, PaginatedData<GetNotificationDto>]> {
        try {
            const { page, limit, read } = filterDto;

            const match: Record<string, any> = {
                tenantId: new Types.ObjectId(tenantId),
                userId: new Types.ObjectId(userId),
            };

            const readValue = read === undefined ? null : read === 'true';
            if (readValue !== null) {
                match.read = readValue;
            }

            const agg = this.notificationModel.aggregate([
                { $match: match },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        message: 1,
                        read: 1,
                    },
                },
            ]);

            const result = await this.notificationModel.aggregatePaginate(agg, {
                page,
                limit,
                useFacet: true,
            });

            const items: GetNotificationDto[] = result.docs.map((not) => ({
                id: not._id.toString(),
                title: not.title,
                message: not.message,
                read: not.read,
            }));

            const data = new PaginatedData<GetNotificationDto>(
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

    async markAsRead(
        id: string,
        tenantId: string,
        userId: string,
    ): Promise<[string, boolean]> {
        try {
            await this.notificationModel.findOneAndUpdate(
                {
                    _id: id,
                    tenantId,
                    userId,
                },
                {
                    $set: {
                        read: true,
                        readAt: new Date(),
                    },
                },
            );

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async markAllAsRead(
        tenantId: string,
        userId: string,
    ): Promise<[string, boolean]> {
        try {
            await this.notificationModel.updateMany(
                { tenantId, userId, read: false },
                { $set: { read: true, readAt: new Date() } },
            );
            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async getUnreadCount(
        tenantId: string,
        userId: string,
    ): Promise<[string, boolean, number]> {
        try {
            const count = await this.notificationModel.countDocuments({
                tenantId,
                userId,
                read: false,
            });
            return ['Success', true, count];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_1AM)
    async cleanupExpired(): Promise<void> {
        await this.notificationModel.deleteMany({
            expiresAt: { $lt: new Date() },
        });
    }
}
