import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AggregatePaginateModel, Types } from 'mongoose';
import {
    CreateDomainDto,
    DomainFilterDto,
    GetDomainDto,
    UpdateDomainDto,
} from './dto/domain.dto';
import { PaginatedData } from '../common/pagination/paginated-data.pagination';
import { DomainDocument, Domain } from '@app/common';
import { GetDomainDocument } from './interface/domain.interface';

@Injectable()
export class DomainService {
    constructor(
        @InjectModel(Domain.name)
        private readonly domainModel: AggregatePaginateModel<DomainDocument>,
    ) {}

    async create(
        dto: CreateDomainDto,
        tenantId: string,
        userId?: string,
    ): Promise<[string, boolean]> {
        try {
            const domain = new this.domainModel({
                title: dto.title,
                description: dto.description,
                tags: dto.tags,
                status: dto.status,
                createdBy: userId,
                tenantId: tenantId,
            });
            await domain.save();
            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async getAll(
        filterDto: DomainFilterDto,
        tenantId: string,
    ): Promise<[string, boolean, PaginatedData<GetDomainDto>]> {
        try {
            const { status, page = 1, limit = 10 } = filterDto;

            const match: Record<string, any> = {
                isDeleted: false,
                tenantId: new Types.ObjectId(tenantId),
            };

            if (status !== undefined) {
                match.status = status === 'true';
            }

            const skip = (page - 1) * limit;

            const [docs, totalDocs] = await Promise.all([
                this.domainModel
                    .find(match)
                    .select('title description status tags createdAt updatedAt')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean<GetDomainDocument[]>()
                    .exec(),
                this.domainModel.countDocuments(match).exec(),
            ]);

            const items: GetDomainDto[] = docs.map((d) => ({
                id: d._id.toString(),
                title: d.title,
                description: d.description,
                status: d.status,
                tags: d.tags || [],
                createdAt: d.createdAt.toISOString(),
                updatedAt: d.updatedAt.toISOString(),
            }));

            const data = new PaginatedData<GetDomainDto>(
                items,
                totalDocs,
                page,
                limit,
            );

            return ['Success', true, data];
        } catch (error: any) {
            return [error.message, false, null];
        }
    }

    async getById(
        id: string,
        tenantId: string,
    ): Promise<[string, boolean, GetDomainDto | null]> {
        try {
            const data = await this.domainModel
                .findOne({ _id: id, tenantId, isDeleted: false })
                .select('title description status tags createdAt updatedAt')
                .lean<GetDomainDocument>()
                .exec();

            if (!data) {
                return ['Domain not found', false, null];
            }

            const result: GetDomainDto = {
                id: data._id.toString(),
                title: data.title,
                description: data.description,
                status: data.status,
                tags: data.tags || [],
                createdAt: data.createdAt.toISOString(),
                updatedAt: data.updatedAt.toISOString(),
            };
            return ['Success', true, result];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async update(
        id: string,
        tenantId: string,
        dto: UpdateDomainDto,
        userId?: string,
    ): Promise<[string, boolean]> {
        try {
            const updatedData = await this.domainModel.findOneAndUpdate(
                {
                    _id: id,
                    tenantId: tenantId,
                },
                {
                    $set: {
                        title: dto.title,
                        description: dto.description,
                        status: dto.status,
                        tags: dto.tags,
                        updatedBy: userId,
                    },
                },
                {
                    new: true,
                    runValidators: true,
                },
            );

            if (!updatedData) {
                return ['Domain not found or unauthorized', false];
            }

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
            const updatedData = await this.domainModel.findOneAndUpdate(
                {
                    _id: id,
                    tenantId: tenantId,
                },
                {
                    $set: {
                        isDeleted: true,
                        status: false,
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

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }
}
