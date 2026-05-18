import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import {
    CreateTenantDto,
    GetTenantDto,
    UpdateTenantDto,
    WhatsappConfigDto,
    WhatsappNumberDto,
} from './dto/tenant.dto';
import { Subscription, Tenant } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
import { RMQ_CONSTANTS } from '@app/common/queue-constants/constants';
import { lastValueFrom } from 'rxjs';
import {
    FileInfo,
    MediaManagerService,
} from '@app/common/media-manager/media-manager.service';
import { RedisService } from '@app/common/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from '@app/common/enums/app.enums';
import axios from 'axios';

@Injectable()
export class TenantService {
    private readonly whatsappApiUrl: string;
    constructor(
        @InjectModel(Tenant.name)
        private readonly tenantModel: Model<Tenant>,
        @InjectModel(Subscription.name)
        private readonly subscriptionModel: Model<Subscription>,
        @Inject(RMQ_CONSTANTS.AI.name)
        private readonly aiClient: ClientProxy,
        private readonly mediaService: MediaManagerService,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
    ) {
        this.whatsappApiUrl = this.configService.get<string>('whatsapp.apiUrl');
    }

    async createTenant(
        dto: CreateTenantDto,
        session?: ClientSession,
    ): Promise<[string, boolean, any]> {
        try {
            const tenant = new this.tenantModel({
                name: dto.name,
                emailAddress: dto.emailAddress,
                address: dto.address,
                websiteUrl: dto.websiteUrl,
                contactEmail: dto.contactEmail,
                logoUrl: dto.logoUrl,
                domain: dto.domain,
            });
            await tenant.save({ session });
            return ['Success', true, tenant];
        } catch (error) {
            return [error.message, false, null];
        }
    }



    async validateDomain(email: string, tenantId?: string): Promise<boolean> {
        try {
            const domain = email.split('@')[1]?.toLowerCase();
            const existingTenant = await this.tenantModel.findOne({
                domain,
                ...(tenantId && { _id: { $ne: tenantId } }),
            });

            return !existingTenant;
        } catch {
            return false;
        }
    }

    async get(tenantId: string): Promise<[string, boolean, GetTenantDto]> {
        try {
            const tenant = await this.tenantModel.findOne({ _id: tenantId });
            const data: GetTenantDto = {
                name: tenant.name,
                emailAddress: tenant.emailAddress,
                googleAuthorized: tenant.googleAuthorized,
                sesEmail: tenant.sesMail,
                contactEmail: tenant.contactEmail,
                logoUrl: tenant.logoUrl,
                slaDays: tenant.slaDays ?? 5,
                status: tenant.status,
            };
            return ['Success', true, data] as [string, boolean, GetTenantDto];
        } catch (err) {
            return [err.message, false, null] as [
                string,
                boolean,
                GetTenantDto,
            ];
        }
    }

    async uploadAndEmbedTenantPdf(
        tenantId: string,
        file: Express.Multer.File,
    ): Promise<[string, boolean, any]> {
        try {
            if (!file || !file.originalname.endsWith('.pdf')) {
                return ['Please upload a PDF file', false, null];
            }

            const [msg, ok, fileInfo] = await this.mediaService.upload(file);
            if (!ok) {
                return [msg, false, null];
            }

            await this.tenantModel.updateOne(
                { _id: tenantId },
                { InformationPDFUrl: fileInfo.url },
            );

            const result: {
                success: boolean;
                message: string;
                chunksEmbedded: number;
            } = await lastValueFrom(
                this.aiClient.send(
                    RMQ_CONSTANTS.AI.listensTo.embed_tenant_pdf,
                    {
                        tenantId,
                        pdfUrl: fileInfo.url,
                    },
                ),
            );

            if (!result.success) {
                return [result.message, false, null];
            }

            return [
                'PDF uploaded and embedded successfully',
                true,
                {
                    pdfUrl: fileInfo.url,
                    chunksEmbedded: result.chunksEmbedded,
                },
            ];
        } catch (error) {
            return [error.message, false, null];
        }
    }
    async update(
        id: string,
        dto: UpdateTenantDto,
        media?: Express.Multer.File,
    ): Promise<[string, boolean]> {
        try {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

            let img: FileInfo | null = null;

            if (media) {
                if (!allowedTypes.includes(media.mimetype)) {
                    return [
                        'Only JPEG, PNG, or WEBP images are allowed',
                        false,
                    ];
                }

                const [msg, ok, uploadedImg] =
                    await this.mediaService.upload(media);
                if (!ok || !uploadedImg) {
                    return [msg, false];
                }

                img = uploadedImg;
            }

            const updateData: any = {};

            if (dto.companyName !== undefined)
                updateData.name = dto.companyName;
            if (dto.companyAddress !== undefined)
                updateData.address = dto.companyAddress;
            if (dto.websiteUrl !== undefined)
                updateData.websiteUrl = dto.websiteUrl;
            if (dto.contactEmail !== undefined)
                updateData.contactEmail = dto.contactEmail;

            if (dto.slaDays !== undefined)
                updateData.slaDays = dto.slaDays;

            if (img) {
                updateData.logoUrl = img.url;
            }

            if (Object.keys(updateData).length === 0) {
                return ['No data provided to update', false];
            }

            const result = await this.tenantModel.updateOne(
                { _id: id },
                { $set: updateData },
            );

            if (result.matchedCount === 0) {
                return ['Tenant not found', false];
            }

            if (result.modifiedCount === 0) {
                return ['No changes detected', false];
            }

            return ['Success', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async saveWhatsappConfig(
        tenantId: string,
        dto: WhatsappConfigDto,
    ): Promise<[string, boolean]> {
        try {
            const existing = await this.tenantModel
                .findById(tenantId)
                .select('liveContact')
                .lean();

            const updateData: Record<string, any> = {
                liveContact: dto.phoneNumberId,
                businessId: dto.businessId,
                whatsappAccessToken: dto.accessToken,
                lastWhatsappHealthCheck: null,
                whatsappHealthStatus: false,
            };

            const result = await this.tenantModel.updateOne(
                { _id: tenantId },
                { $set: updateData },
            );
            if (result.matchedCount === 0) return ['Tenant not found', false];

            const keysToDelete = new Set<string>();
            if (existing?.liveContact)
                keysToDelete.add(`tenant:${existing.liveContact}`);
            keysToDelete.add(`tenant:${dto.phoneNumberId}`);
            await Promise.all(
                [...keysToDelete].map((k) => this.redisService.del(k)),
            );

            return ['WhatsApp configuration saved', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async saveLiveContact(
        tenantId: string,
        dto: WhatsappNumberDto,
    ): Promise<[string, boolean]> {
        try {
            const existing = await this.tenantModel
                .findById(tenantId)
                .select('liveContact')
                .lean();

            const updateData: Record<string, any> = {
                liveContact: dto.phoneNumber,
            };

            if (dto.healthCheckNumber !== undefined)
                updateData.healthCheckNumber = dto.healthCheckNumber;

            const result = await this.tenantModel.updateOne(
                { _id: tenantId },
                { $set: updateData },
            );
            if (result.matchedCount === 0) return ['Tenant not found', false];

            const keysToDelete = new Set<string>();
            if (existing?.liveContact)
                keysToDelete.add(`tenant:${existing.liveContact}`);
            keysToDelete.add(`tenant:${dto.phoneNumber}`);
            await Promise.all(
                [...keysToDelete].map((k) => this.redisService.del(k)),
            );

            return ['WhatsApp number saved', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async getWhatsappConfig(tenantId: string): Promise<
        [
            string,
            boolean,
            {
                phoneNumberId: string | null;
                businessId: string | null;
                isTokenSet: boolean;
            } | null,
        ]
    > {
        try {
            const tenant = await this.tenantModel
                .findById(tenantId)
                .select('liveContact businessId whatsappAccessToken')
                .lean();
            if (!tenant) return ['Tenant not found', false, null];
            return [
                'Success',
                true,
                {
                    phoneNumberId: tenant.liveContact ?? null,
                    businessId: tenant.businessId ?? null,
                    isTokenSet: Boolean(tenant.whatsappAccessToken),
                },
            ];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async deleteJobsincKnowledge(): Promise<void> {
        try {
            await lastValueFrom(
                this.aiClient.emit(
                    RMQ_CONSTANTS.AI.listensTo.delete_jobsinc_knowledge,
                    {},
                ),
            );
        } catch (error) {
            throw error;
        }
    }

    async whatsappStatus(
        tenantId: string,
    ): Promise<[string, boolean, { status: boolean; message: string }]> {
        try {
            const tenant = await this.tenantModel
                .findById(tenantId)
                .select(
                    'liveContact businessId whatsappAccessToken healthCheckNumber lastWhatsappHealthCheck whatsappHealthStatus, whatsappStatusMessage',
                )
                .lean();

            if (!tenant)
                return [
                    'Success',
                    true,
                    { status: false, message: 'Tenant not found' },
                ];

            const FOUR_HOURS = 4 * 60 * 60 * 1000;
            if (
                tenant.lastWhatsappHealthCheck &&
                Date.now() -
                    new Date(tenant.lastWhatsappHealthCheck).getTime() <
                    FOUR_HOURS
            ) {
                return [
                    'Success',
                    true,
                    {
                        status: tenant.whatsappHealthStatus ?? false,
                        message: tenant.whatsappHealthStatus
                            ? 'WhatsApp number is active and connected.'
                            : tenant.whatsappStatusMessage,
                    },
                ];
            }

            return this.runWhatsappHealthCheck(tenantId, tenant);
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async forceWhatsappHealthCheck(
        tenantId: string,
    ): Promise<[string, boolean, { status: boolean; message: string }]> {
        try {
            const tenant = await this.tenantModel
                .findById(tenantId)
                .select(
                    'liveContact businessId whatsappAccessToken healthCheckNumber lastForceCheckDate forceCheckCount',
                )
                .lean();

            if (!tenant)
                return [
                    'Success',
                    true,
                    { status: false, message: 'Tenant not found' },
                ];

            const today = new Date().toDateString();
            const lastDate = tenant.lastForceCheckDate
                ? new Date(tenant.lastForceCheckDate).toDateString()
                : null;
            const isToday = lastDate === today;
            const count = isToday ? (tenant.forceCheckCount ?? 0) : 0;

            if (count >= 3) {
                return [
                    'Success',
                    true,
                    {
                        status: false,
                        message:
                            'Force health check limit of 3 per day reached. Try again tomorrow.',
                    },
                ];
            }

            await this.tenantModel.updateOne(
                { _id: tenantId },
                {
                    $set: {
                        lastForceCheckDate: new Date(),
                        forceCheckCount: count + 1,
                    },
                },
            );

            return this.runWhatsappHealthCheck(tenantId, tenant);
        } catch (error) {
            return [error.message, false, null];
        }
    }

    private async runWhatsappHealthCheck(
        tenantId: string,
        tenant: Pick<
            Tenant,
            | 'liveContact'
            | 'businessId'
            | 'whatsappAccessToken'
            | 'healthCheckNumber'
        >,
    ): Promise<[string, boolean, { status: boolean; message: string }]> {

        const subscription = await this.subscriptionModel
            .findOne({ tenantId, status: SubscriptionStatus.ACTIVE })
            .select('whatsappManagedActive')
            .lean();

        const whatsappManagedActive =
            subscription?.whatsappManagedActive ?? false;

        if (!tenant.liveContact) {
            return [
                'Success',
                true,
                {
                    status: false,
                    message:
                        'WhatsApp is not configured. Phone number ID is required.',
                },
            ];
        }

        if (!tenant.businessId) {
            return [
                'Success',
                true,
                {
                    status: false,
                    message: whatsappManagedActive
                        ? 'Please wait for the JobsInc administrator to update your Business ID.'
                        : 'WhatsApp is not configured. Business ID is required.',
                },
            ];
        }

        if (!whatsappManagedActive && !tenant.whatsappAccessToken) {
            return [
                'Success',
                true,
                {
                    status: false,
                    message:
                        'No WhatsApp access token available. Configure your access token or activate managed WhatsApp.',
                },
            ];
        }

        if (!tenant.healthCheckNumber) {
            return [
                'Success',
                true,
                {
                    status: false,
                    message:
                        'Health check number is not configured. Please set a number to verify WhatsApp connectivity.',
                },
            ];
        }

        const token = whatsappManagedActive
            ? this.configService.get<string>('whatsapp.token')
            : tenant.whatsappAccessToken;

        let isActive = false;
        let statusMessage = 'WhatsApp number is not active.';

        try {
            const response = await axios.post(
                `${this.whatsappApiUrl}/${tenant.businessId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: tenant.healthCheckNumber,
                    type: 'template',
                    template: {
                        name: 'hello_world',
                        language: { code: 'en_US' },
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                },
            );
            isActive = response.status === 200;
            statusMessage = isActive
                ? 'WhatsApp number is active and connected.'
                : 'WhatsApp number is not active.';
        } catch (err) {
            const apiError =
                err?.response?.data?.error?.message ?? err.message;
            statusMessage = `WhatsApp API error: ${apiError}`;
        }

        await this.tenantModel.updateOne(
            { _id: tenantId },
            {
                $set: {
                    lastWhatsappHealthCheck: new Date(),
                    whatsappHealthStatus: isActive,
                    whatsappStatusMessage: statusMessage,
                },
            },
        );

        return [
            'Success',
            true,
            {
                status: isActive,
                message: statusMessage,
            },
        ];
    }
}
