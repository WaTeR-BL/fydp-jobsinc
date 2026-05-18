import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    TenantEmailTemplate,
    TenantEmailTemplateDocument,
} from '@app/common/schemas/tenant-email-template.schema';
import {
    CUSTOMIZABLE_TEMPLATES,
    UpsertEmailTemplateDto,
} from '../dto/tenant-email-template.dto';

@Injectable()
export class TenantEmailTemplateService {
    constructor(
        @InjectModel(TenantEmailTemplate.name)
        private readonly templateModel: Model<TenantEmailTemplateDocument>,
    ) {}

    async getAll(tenantId: string): Promise<[string, boolean, any[]]> {
        try {
            const templates = await this.templateModel
                .find({ tenantId: new Types.ObjectId(tenantId) })
                .lean();
            return ['Success', true, templates];
        } catch (err) {
            return [err.message, false, []];
        }
    }

    async getOne(
        tenantId: string,
        templateType: string,
    ): Promise<[string, boolean, any | null]> {
        try {
            if (!CUSTOMIZABLE_TEMPLATES.includes(templateType)) {
                return ['Template type is not customizable', false, null];
            }
            const template = await this.templateModel
                .findOne({
                    tenantId: new Types.ObjectId(tenantId),
                    templateType,
                })
                .lean();
            return ['Success', true, template ?? null];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async upsert(
        tenantId: string,
        type: string,
        dto: UpsertEmailTemplateDto,
    ): Promise<[string, boolean]> {
        try {
            await this.templateModel.findOneAndUpdate(
                {
                    tenantId: new Types.ObjectId(tenantId),
                    templateType: type,
                },
                {
                    $set: {
                        subject: dto.subject,
                        htmlContent: dto.htmlContent,
                    },
                },
                { upsert: true, new: true },
            );
            return ['Template saved', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async remove(
        tenantId: string,
        templateType: string,
    ): Promise<[string, boolean]> {
        try {
            if (!CUSTOMIZABLE_TEMPLATES.includes(templateType)) {
                return ['Template type is not customizable', false];
            }
            await this.templateModel.deleteOne({
                tenantId: new Types.ObjectId(tenantId),
                templateType,
            });
            return [
                'Custom template removed — system default will be used',
                true,
            ];
        } catch (err) {
            return [err.message, false];
        }
    }

    /** Used by EmailService to resolve the template for a tenant */
    async findCustomTemplate(
        tenantId: string,
        templateType: string,
    ): Promise<TenantEmailTemplateDocument | null> {
        return this.templateModel
            .findOne({
                tenantId: new Types.ObjectId(tenantId),
                templateType,
            })
            .lean() as any;
    }
}
