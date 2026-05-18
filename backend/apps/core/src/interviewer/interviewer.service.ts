import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AggregatePaginateModel, ClientSession, Types } from 'mongoose';
import {
    Interviewer,
    InterviewerDocument,
} from '@app/common/schemas/interviewer.schema';
import {
    CreateTimeSlotDto,
    GetTimeSlotDto,
    TimeSlotDto,
} from './dto/interviewer.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { toLocal, toUtc } from '../common/helper/timezone-handler.helper';
import { DateTime } from 'luxon';

@Injectable()
export class InterviewerService {
    constructor(
        @InjectModel(Interviewer.name)
        private readonly interviewerModel: AggregatePaginateModel<InterviewerDocument>,
    ) {}

    private validateFutureTimeSlots(
        slots: CreateTimeSlotDto[],
        timezone: string,
    ): void {
        const minDate = toUtc(DateTime.now().toISO(), timezone);
        minDate.setDate(minDate.getDate() + 1);
        minDate.setHours(0, 0, 0, 0);

        for (const slot of slots) {
            if (
                toUtc(slot.startTime, timezone) < minDate ||
                toUtc(slot.endTime, timezone) < minDate
            ) {
                throw new Error(
                    `Start time and end time must be greater than or equal to ${minDate}`,
                );
            }
        }
    }

    private validateTimeSlots(
        timeSlots: CreateTimeSlotDto[],
        timezone: string,
    ): void {
        if (!timeSlots || timeSlots.length === 0) {
            throw new Error('At least one time slot is required');
        }

        for (let i = 0; i < timeSlots.length; i++) {
            const slot = timeSlots[i];
            const start = toUtc(slot.startTime, timezone);
            const end = toUtc(slot.endTime, timezone);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error(`Invalid date format in time slot ${i + 1}`);
            }

            if (start >= end) {
                throw new Error(
                    `Time slot ${i + 1}: start time must be before end time`,
                );
            }

            if (start < toUtc(DateTime.now().toISO(), timezone)) {
                throw new Error(
                    `Time slot ${i + 1}: start time cannot be in the past`,
                );
            }

            const durationMinutes =
                (end.getTime() - start.getTime()) / (1000 * 60);
            if (durationMinutes < 15) {
                throw new Error(
                    `Time slot ${i + 1}: minimum duration is 15 minutes`,
                );
            }
        }

        const sortedSlots = [...timeSlots].sort(
            (a, b) =>
                toUtc(a.startTime, timezone).getTime() -
                toUtc(b.startTime, timezone).getTime(),
        );

        for (let i = 0; i < sortedSlots.length - 1; i++) {
            const currentEnd = toUtc(sortedSlots[i].endTime, timezone);
            const nextStart = toUtc(sortedSlots[i + 1].startTime, timezone);

            if (currentEnd > nextStart) {
                throw new Error(`Time slots ${i + 1} and ${i + 2} overlap`);
            }
        }
    }

    async create(
        tenantId: string,
        userId: string,
        dto: CreateTimeSlotDto[],
        timezone: string,
    ): Promise<[string, boolean]> {
        try {
            this.validateFutureTimeSlots(dto, timezone);
            this.validateTimeSlots(dto, timezone);

            const existing = await this.interviewerModel
                .findOne({
                    userId: userId,
                    tenantId: tenantId,
                })
                .lean();

            if (existing) {
                return ['Interviewer record already exists', false];
            }

            const slot = new this.interviewerModel({
                tenantId: tenantId,
                userId: userId,
                timeSlots: dto.map((m) => ({
                    startTime: toUtc(m.startTime, timezone),
                    endTime: toUtc(m.endTime, timezone),
                    selected: false,
                })),
            });

            await slot.save();
            return ['Success', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async addTimeSlots(
        interviewerId: string,
        tenantId: string,
        dto: CreateTimeSlotDto[],
        timezone: string,
    ): Promise<[string, boolean]> {
        try {
            this.validateFutureTimeSlots(dto, timezone);
            this.validateTimeSlots(dto, timezone);

            const interviewer = await this.interviewerModel.findById({
                _id: interviewerId,
                tenantId: tenantId,
            });

            if (!interviewer) {
                return ['Interviewer not found', false];
            }

            const newSlots = dto.map((m) => ({
                startTime: toUtc(m.startTime, timezone),
                endTime: toUtc(m.endTime, timezone),
                selected: false,
                isDeleted: false,
                reserved: m.reserved,
            }));

            interviewer.timeSlots.push(...newSlots);
            await interviewer.save();

            return ['Success', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async getAll(
        tenantId: string,
    ): Promise<[string, boolean, GetTimeSlotDto[] | null]> {
        try {
            const tId = new Types.ObjectId(tenantId);

            const interviewers = await this.interviewerModel.aggregate([
                { $match: { tenantId: tId } },
                {
                    $lookup: {
                        from: 'users',
                        let: { uId: '$userId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$_id', '$$uId'] },
                                            { $eq: ['$isDeleted', false] },
                                            { $eq: ['$status', true] },
                                        ],
                                    },
                                },
                            },
                            { $project: { _id: 1, name: 1, timezone: 1 } },
                        ],
                        as: 'user',
                    },
                },
                { $unwind: '$user' },
                {
                    $project: {
                        tenantId: 1,
                        userId: 1,
                        name: '$user.name',
                    },
                },
            ]);

            if (!interviewers.length) {
                return ['Success', true, []];
            }

            const result: GetTimeSlotDto[] = interviewers.map((i) => ({
                interviewerId: i._id.toString(),
                tenantId: i.tenantId.toString(),
                userId: i.userId.toString(),
                name: i.name,
                timeSlots: null,
            }));

            return ['Success', true, result];
        } catch (err: any) {
            return [err.message, false, null];
        }
    }

    async getById(
        interviewerId: string,
        tenantId: string,
        session: ClientSession,
    ): Promise<[string, boolean, GetTimeSlotDto | null]> {
        try {
            const id = new Types.ObjectId(interviewerId);
            const tId = new Types.ObjectId(tenantId);

            const [data] = await this.interviewerModel.aggregate(
                [
                    {
                        $match: {
                            _id: id,
                            tenantId: tId,
                            timeSlots: {
                                $elemMatch: { isDeleted: false },
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'userId',
                            foreignField: '_id',
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
                            tenantId: 1,
                            userId: 1,
                            timeSlots: 1,
                            timezone: '$user.timezone',
                        },
                    },
                ],
                { session },
            );

            if (!data) {
                return ['Interviewer not found', false, null];
            }

            const timezone = data.timezone;

            const slots: GetTimeSlotDto = {
                interviewerId: String(data._id),
                tenantId: String(data.tenantId),
                userId: String(data.userId),
                timeSlots: data.timeSlots.map((e: any) => ({
                    startTime: toLocal(e.startTime, timezone),
                    endTime: toLocal(e.endTime, timezone),
                    timeSlotId: String(e._id),
                    selected: e.selected,
                    reserved: e.reserved,
                })),
            };

            return ['Success', true, slots];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async validateSlots(
        interviewerId: string,
        tenantId: string,
    ): Promise<[string, boolean, GetTimeSlotDto | null]> {
        try {
            const id = new Types.ObjectId(interviewerId);
            const tId = new Types.ObjectId(tenantId);

            const [data] = await this.interviewerModel.aggregate([
                {
                    $match: {
                        _id: id,
                        tenantId: tId,
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
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
                        tenantId: 1,
                        userId: 1,
                        timezone: '$user.timezone',
                        timeSlots: {
                            $filter: {
                                input: '$timeSlots',
                                as: 'slot',
                                cond: {
                                    $and: [
                                        { $eq: ['$$slot.isDeleted', false] },
                                        { $eq: ['$$slot.selected', false] },
                                    ],
                                },
                            },
                        },
                    },
                },
            ]);

            if (!data) {
                return ['Interviewer not found', false, null];
            }

            const timezone = data.timezone || 'UTC';

            const tomorrowStartLocal = DateTime.now()
                .setZone(timezone)
                .plus({ days: 1 })
                .startOf('day');

            const tomorrowStartUtc = tomorrowStartLocal.toUTC().toJSDate();

            const upcomingSlots = (data.timeSlots || []).filter(
                (s: any) => new Date(s.startTime) >= tomorrowStartUtc,
            );

            if (upcomingSlots.length === 0) {
                return ["Didn't define slots for upcoming days", false, null];
            }

            const slots: GetTimeSlotDto = {
                interviewerId: String(interviewerId),
                tenantId: String(data.tenantId),
                userId: String(data.userId),
                timeSlots: upcomingSlots.map((e: any) => ({
                    startTime: toLocal(e.startTime, timezone),
                    endTime: toLocal(e.endTime, timezone),
                    timeSlotId: String(e._id),
                    selected: e.selected,
                })),
                count: upcomingSlots.length,
            };

            return ['Success', true, slots];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async get(
        userId: string,
        tenantId: string,
        timezone: string,
    ): Promise<[string, boolean, GetTimeSlotDto | null]> {
        try {
            const data = await this.interviewerModel
                .findOne({
                    userId: userId,
                    tenantId: tenantId,
                })
                .exec();

            if (!data) {
                return ['Interviewer not found', false, null];
            }

            const slots: GetTimeSlotDto = {
                interviewerId: String(data._id),
                tenantId: String(data.tenantId),
                userId: String(data.userId),
                timeSlots: data.timeSlots
                    .filter((e: any) => !e.isDeleted)
                    .map((e: any) => ({
                        startTime: toLocal(e.startTime, timezone),
                        endTime: toLocal(e.endTime, timezone),
                        timeSlotId: String(e._id),
                        selected: e.selected,
                        reserved: e.reserved,
                    })),
            };

            return ['Success', true, slots];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async updateTimeSlotSelection(
        interviewerId: string,
        timeSlotId: string,
        session?: ClientSession,
    ): Promise<[string, boolean]> {
        try {
            const result = await this.interviewerModel.updateOne(
                {
                    _id: new Types.ObjectId(interviewerId),
                    timeSlots: {
                        $elemMatch: {
                            _id: new Types.ObjectId(timeSlotId),
                            selected: false,
                            isDeleted: false,
                        },
                    },
                },
                { $set: { 'timeSlots.$.selected': true } },
                { session },
            );

            if (result.modifiedCount === 0) {
                return ['Time slot not found or already selected', false];
            }

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async getAvailableSlots(
        interviewerId: string,
        timezone: string,
    ): Promise<[string, boolean, GetTimeSlotDto | null]> {
        try {
            const data = await this.interviewerModel
                .findById(interviewerId)
                .exec();

            if (!data) {
                return ['Interviewer not found', false, null];
            }

            const now = toUtc(DateTime.now().toISO(), timezone);
            const availableSlots = data.timeSlots.filter(
                (slot: any) =>
                    !slot.selected &&
                    !slot.isDeleted &&
                    toUtc(slot.startTime, timezone) > now,
            );

            const slots: GetTimeSlotDto = {
                interviewerId: interviewerId,
                tenantId: String(data.tenantId),
                userId: String(data.userId),
                timeSlots: availableSlots.map((e: any) => ({
                    startTime: toLocal(e.startTime, timezone),
                    endTime: toLocal(e.endTime, timezone),
                    timeSlotId: String(e._id),
                    selected: false,
                    reserved: e.reserved,
                })),
            };

            return ['Success', true, slots];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async releaseTimeSlot(
        interviewerId: string,
        timeSlotId: string,
        session?: ClientSession,
    ): Promise<[string, boolean]> {
        try {
            const options = session ? { session, new: true } : { new: true };

            const result = await this.interviewerModel.findOneAndUpdate(
                {
                    _id: interviewerId,
                    'timeSlots._id': timeSlotId,
                },
                {
                    $set: {
                        'timeSlots.$.selected': false,
                    },
                },
                options,
            );

            if (!result) {
                return ['Time slot not found', false];
            }

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async deletePastTimeSlots() {
        try {
            const now = new Date();

            await this.interviewerModel.updateMany(
                {},
                { $set: { 'timeSlots.$[elem].isDeleted': true } },
                {
                    arrayFilters: [
                        {
                            'elem.startTime': { $lt: now },
                            'elem.isDeleted': false,
                        },
                    ],
                },
            );
        } catch {}
    }

    async delete(interviewerId: string): Promise<[string, boolean]> {
        try {
            const interviewer =
                await this.interviewerModel.findById(interviewerId);

            if (!interviewer) {
                return ['Interviewer not found', false];
            }

            const hasSelectedSlots = interviewer.timeSlots.some(
                (slot) => slot.selected,
            );

            if (hasSelectedSlots) {
                return [
                    'Cannot delete interviewer with selected time slots',
                    false,
                ];
            }

            await interviewer.deleteOne();

            return ['Success', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async reservedTimeSlots(
        userId: string,
        tenantId: string,
    ): Promise<[string, boolean, TimeSlotDto[]]> {
        try {
            const [data] = await this.interviewerModel.aggregate([
                {
                    $match: {
                        userId: new Types.ObjectId(userId),
                        tenantId: new Types.ObjectId(tenantId),
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
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
                        tenantId: 1,
                        userId: 1,
                        timezone: '$user.timezone',
                        timeSlots: {
                            $filter: {
                                input: '$timeSlots',
                                as: 'slot',
                                cond: {
                                    $and: [
                                        { $eq: ['$$slot.isDeleted', false] },
                                        { $eq: ['$$slot.selected', false] },
                                        { $eq: ['$$slot.reserved', true] },
                                    ],
                                },
                            },
                        },
                    },
                },
            ]);

            if (!data) {
                return ['Success', true, []];
            }

            const tomorrowStartLocal = DateTime.now()
                .setZone(data.timezone)
                .plus({ days: 1 })
                .startOf('day');

            const tomorrowStartUtc = tomorrowStartLocal.toUTC().toJSDate();

            const upcomingSlots = (data.timeSlots || []).filter(
                (s: any) => new Date(s.startTime) >= tomorrowStartUtc,
            );

            if (upcomingSlots.length === 0) {
                return ['Success', true, []];
            }

            const timeSlots: TimeSlotDto[] = upcomingSlots.map((e: any) => ({
                startTime: toLocal(e.startTime, data.timezone),
                endTime: toLocal(e.endTime, data.timezone),
                timeSlotId: String(e._id),
                selected: e.selected,
                reserved: e.reserved,
            }));

            return ['Success', true, timeSlots];
        } catch (err) {
            return [err.message, false, null];
        }
    }
}
