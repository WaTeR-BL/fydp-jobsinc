import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AggregatePaginateModel, ClientSession, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
    CreateUserDto,
    EmployeeFilterDto,
    GetAllTenantEmployeeDto,
    GetTenantEmployeeDto,
    ResetPasswordDto,
    UpdateUserDto,
} from './dto/user.dto';
import {
    AuthProvider,
    AuthUserType,
    EmailTemplate,
    UserRole,
} from '@app/common/enums/app.enums';
import { User, UserDocument } from '@app/common';
import { PaginatedData } from '../common/pagination/paginated-data.pagination';
import { getEnumText } from '@app/common/enums/enum.helper';
import { toLocal } from '../common/helper/timezone-handler.helper';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';
import { SendEmail } from '../email/interface/email.interface';
import { TenantService } from '../tenant/tenant.service';
import { ConfigService } from '@nestjs/config';
import { MFADeleteStatus } from '@aws-sdk/client-s3';
import { TwoFactorAuthHelper } from '../common/helper/2fa.helper';

@Injectable()
export class UserService {
    private readonly frontendUrl: string;
    constructor(
        @InjectModel(User.name)
        private readonly userModel: AggregatePaginateModel<UserDocument>,
        private readonly emailService: EmailService,
        private readonly tenantService: TenantService,
        private readonly config: ConfigService,
    ) {
        this.frontendUrl = this.config.get<string>('frontend.url');
    }

    async validateUser(
        email: string,
        password: string,
    ): Promise<[string, boolean, any]> {
        try {
            const data = await this.userModel
                .findOne({
                    emailAddress: email,
                    status: true,
                    isDeleted: false,
                })
                .exec();
            if (!data) return ['No such user exist', false, null];

            if (data.tenantId) {
                const [msg, ok, tenant] = await this.tenantService.get(data.tenantId.toString());
                if (!ok) return [msg, false, null];
                if (!tenant.status) return ['Tenant is deactivated, please contact jobsinc administrator', false, data];
            }

            const isValid: boolean = await bcrypt.compare(
                password,
                data.password,
            );
            if (!isValid) return ['Invalid Credentials', false, null];
            return ['Success', true, data];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async findByEmail(email: string): Promise<[string, boolean, any]> {
        try {
            const data = await this.userModel
                .findOne({
                    emailAddress: email,
                    status: true,
                    isDeleted: false,
                })
                .exec();
            return ['Success', true, data];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async update2FaCode(
        id: string,
        code: string,
        qrCode: string,
    ): Promise<[string, boolean]> {
        try {
            const result = await this.userModel.updateOne(
                {
                    _id: new Types.ObjectId(id),
                },
                {
                    $set: {
                        code: code,
                        qrCode: qrCode,
                    },
                },
            );

            if (result.matchedCount === 0) {
                return ['User not found', false];
            }

            return ['Success', true];
        } catch (e) {
            return [e.message, false];
        }
    }

    async reset2Fa(id: string, tenantId: string): Promise<[string, boolean]> {
        try {
            const result = await this.userModel.updateOne(
                {
                    _id: new Types.ObjectId(id),
                    tenantId: new Types.ObjectId(tenantId),
                },
                {
                    $set: {
                        code: null,
                        qrCode: null,
                        is2FAVerified: false,
                    },
                },
            );

            if (result.matchedCount === 0) {
                return ['User not found', false];
            }

            return ['Success', true];
        } catch (e) {
            return [e.message, false];
        }
    }

    async activate2FA(id: string): Promise<[string, boolean]> {
        try {
            const result = await this.userModel.updateOne(
                {
                    _id: new Types.ObjectId(id),
                },
                {
                    $set: {
                        is2FAVerified: true,
                    },
                },
            );

            if (result.matchedCount === 0) {
                return ['User not found', false];
            }

            return ['Success', true];
        } catch (e) {
            return [e.message, false];
        }
    }

    async findById(id: string): Promise<[string, boolean, any]> {
        try {
            const data = await this.userModel.findById(id).exec();
            if (!data) return ['User not found', false, null];
            return ['Success', true, data];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async createUser(
        dto: CreateUserDto,
        tenantId: string,
        tenantOnboarding: boolean,
        session?: ClientSession,
    ): Promise<[string, boolean]> {
        try {
            if (!tenantOnboarding) {
                const valid = await this.tenantService.validateDomain(
                    dto.emailAddress,
                    tenantId,
                );
                if (!valid)
                    return [
                        'user email domain should be same as tenant email domain',
                        false,
                    ];
            }

            const [emailMessage, emailSuccess, emailResult] =
                await this.emailService.getCachedEmailVerification(
                    dto.emailAddress,
                );

            if (!emailSuccess || !emailResult?.valid) {
                return [
                    !emailSuccess ? emailMessage : emailResult.reason,
                    false,
                ];
            }
            const password: string = await this.hashData(dto.password);
            const user = new this.userModel({
                emailAddress: dto.emailAddress,
                name: dto.name,
                tenantId: tenantId,
                authProvider: AuthProvider.LOCAL,
                password: password,
                roles: dto.roles,
                timezone: dto.timezone,
                enable2FA: dto.enable2FA,
            });
            await user.save({ session });
            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async update2FAStatus(
        id: string,
        status: boolean,
        tenantId: string,
        code?: string,
    ): Promise<[string, boolean]> {
        try {
            if (!status) {
                const user = await this.userModel.findOne({
                    _id: new Types.ObjectId(id),
                    tenantId: new Types.ObjectId(tenantId),
                });
                if (!user) return ['User not found', false];

                if (user.enable2FA && user.is2FAVerified) {
                    if (!code) return ['2FA code required to disable 2FA', false];
                    const isValid = TwoFactorAuthHelper.verifyToken(user.code, code);
                    if (!isValid) return ['Invalid 2FA code', false];
                }
            }

            const updateFields: Record<string, any> = { enable2FA: status };
            if (!status) {
                updateFields.code = null;
                updateFields.qrCode = null;
                updateFields.is2FAVerified = false;
            }

            const result = await this.userModel.updateOne(
                {
                    _id: new Types.ObjectId(id),
                    tenantId: new Types.ObjectId(tenantId),
                },
                { $set: updateFields },
            );

            if (result.matchedCount === 0) return ['User not found', false];

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async updateUser(
        id: string,
        dto: UpdateUserDto,
        tenantId: string,
    ): Promise<[string, boolean]> {
        try {
            const result = await this.userModel.updateOne(
                {
                    _id: new Types.ObjectId(id),
                    tenantId: new Types.ObjectId(tenantId),
                },
                {
                    $set: {
                        name: dto.name,
                        timezone: dto.timezone,
                    },
                },
            );

            if (result.matchedCount === 0) {
                return ['User not found', false];
            }

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async updateRtHash(
        userId: string,
        refreshToken: string,
    ): Promise<[string, boolean]> {
        try {
            const rt = await this.hashData(refreshToken);
            const update = await this.userModel.findByIdAndUpdate(
                userId,
                {
                    hashedRefreshToken: rt,
                },
                { new: false },
            );
            if (!update) return ['Failure', false];

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async deleteUserRtHash(userId: string): Promise<[string, boolean]> {
        try {
            const update = await this.userModel.findByIdAndUpdate(
                userId,
                {
                    hashedRefreshToken: null,
                },
                { new: false },
            );
            if (!update) return ['Failure', false];

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    hashData(data: string) {
        return bcrypt.hash(data, 10);
    }

    async getAllTenantEmployee(
        tenantId: string,
        filterDto: EmployeeFilterDto,
        timezone: string,
    ): Promise<[string, boolean, PaginatedData<GetAllTenantEmployeeDto>]> {
        try {
            const { status, userRole, page, limit } = filterDto;

            const match: Record<string, any> = {
                tenantId: new Types.ObjectId(tenantId),
                isDeleted: false,
            };

            if (status !== undefined) {
                match.status = status === 'true';
            }

            if (userRole && userRole.length > 0) {
                match.roles = { $in: userRole };
            }

            const agg = this.userModel.aggregate([
                { $match: match },
                {
                    $project: {
                        name: 1,
                        emailAddress: 1,
                        roles: 1,
                        status: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    },
                },
                { $sort: { createdAt: -1 } },
            ]);

            const result = await this.userModel.aggregatePaginate(agg, {
                page,
                limit,
                useFacet: true,
            });

            const items: GetAllTenantEmployeeDto[] = result.docs.map(
                (user) => ({
                    id: user._id.toString(),
                    fullName: user.name,
                    emailAddress: user.emailAddress,
                    roles: user.roles.map((role: number) =>
                        getEnumText(role, UserRole),
                    ),
                    status: user.status,
                    createdAt: toLocal(user.createdAt, timezone),
                    updatedAt: toLocal(user.updatedAt, timezone),
                }),
            );

            const data = new PaginatedData<GetAllTenantEmployeeDto>(
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

    async delete(
        id: string,
        tenantId: string,
        userId?: string,
    ): Promise<[string, boolean]> {
        try {
            const updatedData = await this.userModel.findOneAndUpdate(
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
                return ['User not found', false];
            }

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async getById(
        id: string,
        tenantId: string,
        timezone: string,
    ): Promise<[string, boolean, GetTenantEmployeeDto]> {
        try {
            const [employee] = await this.userModel.aggregate([
                {
                    $match: {
                        _id: new Types.ObjectId(id),
                        tenantId: new Types.ObjectId(tenantId),
                        isDeleted: false,
                    },
                },
                {
                    $lookup: {
                        from: 'tenants',
                        localField: 'tenantId',
                        foreignField: '_id',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    name: 1,
                                    logoUrl: 1,
                                },
                            },
                        ],
                        as: 'tenant',
                    },
                },
                {
                    $addFields: {
                        tenantName: {
                            $ifNull: [
                                { $arrayElemAt: ['$tenant.name', 0] },
                                null,
                            ],
                        },
                        tenantLogoUrl: {
                            $ifNull: [
                                { $arrayElemAt: ['$tenant.logoUrl', 0] },
                                null,
                            ],
                        },
                    },
                },
                {
                    $lookup: {
                        from: 'credentialManager',
                        let: {
                            userId: '$_id',
                            tenantId: '$tenantId',
                            hasRole3: { $in: [3, '$roles'] },
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: [
                                                    '$tenantId',
                                                    '$$tenantId',
                                                ],
                                            },
                                            { $eq: ['$$hasRole3', true] },
                                        ],
                                    },
                                },
                            },
                            {
                                $project: {
                                    _id: 0,
                                    matchedCredential: {
                                        $first: {
                                            $filter: {
                                                input: '$googleCredentials',
                                                as: 'gc',
                                                cond: {
                                                    $eq: [
                                                        '$$gc.userId',
                                                        '$$userId',
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            {
                                $project: {
                                    isGoogleInitialized: {
                                        $cond: [
                                            {
                                                $ifNull: [
                                                    '$matchedCredential',
                                                    false,
                                                ],
                                            },
                                            true,
                                            false,
                                        ],
                                    },
                                    isGoogleExpired: {
                                        $ifNull: [
                                            '$matchedCredential.isExpired',
                                            false,
                                        ],
                                    },
                                },
                            },
                        ],
                        as: 'googleStatus',
                    },
                },
                {
                    $addFields: {
                        isGoogleInitialized: {
                            $ifNull: [
                                {
                                    $arrayElemAt: [
                                        '$googleStatus.isGoogleInitialized',
                                        0,
                                    ],
                                },
                                false,
                            ],
                        },
                        isGoogleExpired: {
                            $ifNull: [
                                {
                                    $arrayElemAt: [
                                        '$googleStatus.isGoogleExpired',
                                        0,
                                    ],
                                },
                                false,
                            ],
                        },
                    },
                },
                {
                    $project: {
                        tenant: 0,
                        googleStatus: 0,
                        __v: 0,
                    },
                },
            ]);

            if (!employee) {
                return ['Domain not found', false, null];
            }

            const hasRole3 = employee.roles?.includes(3);

            const result: GetTenantEmployeeDto = {
                id: employee._id.toString(),
                fullName: employee.name,
                status: employee.status,
                avatarUrl: employee.avatarUrl || null,
                emailAddress: employee.emailAddress,
                roles: employee.roles.map((role: number) =>
                    getEnumText(role, UserRole),
                ),
                createdAt: toLocal(employee.createdAt, timezone),
                updatedAt: toLocal(employee.updatedAt, timezone),
                tenantName: employee.tenantName,
                tenantLogoUrl: employee.tenantLogoUrl,
                isGoogleInitialized: hasRole3
                    ? employee.isGoogleInitialized
                    : null,
                isGoogleExpired: hasRole3 ? employee.isGoogleExpired : null,
                timezone: employee.timezone,
            };

            return ['Success', true, result];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async requestPasswordReset(email: string): Promise<[string, boolean]> {
        try {
            const user = await this.userModel.findOne({
                emailAddress: email,
            });

            const token = randomBytes(32).toString('hex');

            const expires = new Date(Date.now() + 30 * 60 * 1000);

            user.resetPasswordToken = token;
            user.resetPasswordExpires = expires;
            await user.save();

            const resetLink = `${this.frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

            const [msg, ok, tenant] = await this.tenantService.get(
                user.tenantId.toString(),
            );

            if (!ok) return [msg, false];

            const data: SendEmail = {
                tenantId: user.tenantId.toString(),
                fromEmail: tenant.sesEmail,
                fromName: tenant.name,
                toEmail: user.emailAddress,
                emailType: EmailTemplate.RESET_PASSWORD,
                name: user.name,
                resetLink: resetLink,
                companyName: tenant.name,
                companyEmail: tenant.contactEmail,
                userType: AuthUserType.TENANT,
                logoUrl: tenant.logoUrl,
            };

            const [msg1, ok1] = await this.emailService.sendEmail(data);

            if (!ok1) return [msg1, false];

            return ['Success', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async resetPassword(dto: ResetPasswordDto): Promise<[string, boolean]> {
        try {
            const now = new Date();
            const user = await this.userModel.findOne({
                emailAddress: dto.email,
                resetPasswordToken: dto.token,
                resetPasswordExpires: {
                    $gt: now,
                },
            });

            if (!user) {
                return ['Expired', false];
            }

            user.password = await this.hashData(dto.newPassword);

            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;

            await user.save();

            return ['Success', true];
        } catch (err) {
            return [err.message, false];
        }
    }
}
