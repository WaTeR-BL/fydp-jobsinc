import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import {
    ApplicantDetailDto,
    Initialize2FADto,
    LoginDto,
    UserDetailDto,
    Verify2FADto,
} from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { Tokens } from './types/tokens.type';
import { ConfigService } from '@nestjs/config';
import { TwoFactorAuthHelper } from '../common/helper/2fa.helper';
import { User } from '@app/common';
import { AuthUserType } from '@app/common/enums/app.enums';
import { ApplicantService } from '../applicant/applicant.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly applicantService: ApplicantService,
        private readonly config: ConfigService,
    ) {}

    async login(dto: LoginDto): Promise<[string, boolean, UserDetailDto]> {
        try {
            const [msg, status, user] = await this.userService.validateUser(
                dto.email,
                dto.password,
            );

            if (!status || !user) return [msg, false, null];

            if (!user.enable2FA) {
                return await this.completeLogin(user);
            }

            if (!user.code || !user.is2FAVerified) {
                return [
                    '2FA setup required',
                    true,
                    {
                        requiresSetup: true,
                        is2FAEnabled: true,
                        email: user.emailAddress,
                    },
                ];
            }

            if (!dto.code) {
                return [
                    '2FA code required',
                    true,
                    {
                        requires2FA: true,
                        is2FAEnabled: true,
                        email: user.emailAddress,
                    },
                ];
            }

            const isValid = TwoFactorAuthHelper.verifyToken(
                user.code,
                dto.code,
            );

            if (!isValid) {
                return ['Invalid 2FA code', false, null];
            }

            return await this.completeLogin(user);
        } catch (err) {
            return [err.message || 'Login failed', false, null];
        }
    }

    async initialize2FA(
        dto: Initialize2FADto,
    ): Promise<[string, boolean, any]> {
        try {
            const [msg, status, user] = await this.userService.validateUser(
                dto.email,
                dto.password,
            );

            if (!status || !user) return [msg, false, null];

            if (!user.enable2FA) {
                return ['2FA is not enabled for this account', false, null];
            }

            if (user.is2FAVerified && user.code) {
                return ['2FA is already configured', false, null];
            }

            const { secret, qrCode } =
                await TwoFactorAuthHelper.generateSecretWithQR(
                    user.emailAddress,
                );

            const [updateMsg, updated] = await this.userService.update2FaCode(
                user._id.toString(),
                secret,
                qrCode,
            );

            if (!updated) return [updateMsg, false, null];

            return [
                'Scan QR code with google authenticator app',
                true,
                { qrCode, email: user.emailAddress },
            ];
        } catch (err) {
            return [err.message || 'Failed to initialize 2FA', false, null];
        }
    }

    async verify2FASetup(
        dto: Verify2FADto,
    ): Promise<[string, boolean, UserDetailDto]> {
        try {
            const [msg, status, user] = await this.userService.validateUser(
                dto.email,
                dto.password,
            );

            if (!status || !user) return [msg, false, null];

            if (!user.code) {
                return ['2FA setup not initialized', false, null];
            }

            const isValid = TwoFactorAuthHelper.verifyToken(
                user.code,
                dto.code,
            );

            if (!isValid) {
                return ['Invalid verification code', false, null];
            }

            const [activateMsg, activated] = await this.userService.activate2FA(
                user._id.toString(),
            );

            if (!activated) return [activateMsg, false, null];

            return await this.completeLogin(user);
        } catch (err) {
            return [err.message || 'Failed to verify 2FA setup', false, null];
        }
    }

    private async completeLogin(
        user: User,
    ): Promise<[string, boolean, UserDetailDto]> {
        try {
            const tenantId = user.tenantId?.toString() ?? '';
            const tokens = await this.getTokens(
                user._id.toString(),
                tenantId,
                user.timezone,
            );

            if (!tenantId) {
                return [
                    'Success',
                    true,
                    {
                        name: user.name,
                        email: user.emailAddress,
                        roles: user.roles,
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        avatarUrl: user.avatarUrl ?? null,
                        isGoogleInitialized: null,
                        isGoogleExpired: null,
                        tenantName: null,
                        tenantLogoUrl: null,
                        is2FAEnabled: user.enable2FA,
                    },
                ];
            }

            const [msg, ok, rec] = await this.userService.getById(
                user._id.toString(),
                tenantId,
                user.timezone,
            );

            if (!ok) return [msg, false, null];

            return [
                'Success',
                true,
                {
                    name: user.name,
                    email: user.emailAddress,
                    roles: user.roles,
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    avatarUrl: rec.avatarUrl,
                    isGoogleInitialized: rec.isGoogleInitialized,
                    isGoogleExpired: rec.isGoogleExpired,
                    tenantName: rec.tenantName,
                    tenantLogoUrl: rec.tenantLogoUrl,
                    is2FAEnabled: user.enable2FA,
                },
            ];
        } catch (err) {
            return [err.message || 'Failed to complete login', false, null];
        }
    }

    async logout(userId: string): Promise<[string, boolean]> {
        try {
            const [msg, status] =
                await this.userService.deleteUserRtHash(userId);
            if (status === false) return [msg, false];
            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async refreshToken(
        userId: string,
        tenantId: string,
        refreshToken: string,
    ): Promise<[string, boolean, Tokens]> {
        try {
            const [msg, status, data] = await this.userService.findById(userId);
            if (!status) return [msg, false, null];
            const isValid = await bcrypt.compare(
                refreshToken,
                data.hashedRefreshToken,
            );
            if (!isValid) {
                return ['Access Denied', false, null];
            }
            const result = await this.getTokens(
                userId,
                tenantId,
                data.timezone,
            );
            return ['Success', true, result];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async getTokens(
        userId: string,
        tenantId: string,
        timezone: string,
    ): Promise<Tokens> {
        const userType = tenantId ? AuthUserType.TENANT : AuthUserType.GLOBAL;
        const payload = { sub: userId, tenantId, timezone, userType };

        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: '1d',
            secret: this.config.get<string>('secret.access'),
        });

        const refreshToken = await this.jwtService.signAsync(payload, {
            expiresIn: '7d',
            secret: this.config.get<string>('secret.refresh'),
        });
        const [, status] = await this.userService.updateRtHash(
            userId,
            refreshToken,
        );
        if (status === false) return null;
        return { accessToken: accessToken, refreshToken: refreshToken };
    }

    async applicantLogin(
        dto: LoginDto,
    ): Promise<[string, boolean, ApplicantDetailDto]> {
        try {
            const [msg, status, applicant] =
                await this.applicantService.validateApplicant(
                    dto.email,
                    dto.password,
                );

            if (!status || !applicant) return [msg, false, null];

            const data = await this.getApplicantTokens(
                applicant._id.toString(),
                applicant.timezone,
            );

            const userData: ApplicantDetailDto = {
                name: applicant.fullName,
                email: applicant.email,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            };

            return ['Success', true, userData];
        } catch (err) {
            return [err.message || 'Login failed', false, null];
        }
    }

    async getApplicantTokens(
        applicantId: string,
        timezone: string,
    ): Promise<Tokens> {
        const accessToken = await this.jwtService.signAsync(
            {
                sub: applicantId,
                timezone: timezone,
                userType: AuthUserType.GLOBAL,
            },
            {
                expiresIn: '1d',
                secret: this.config.get<string>('secret.access'),
            },
        );

        const refreshToken = await this.jwtService.signAsync(
            {
                sub: applicantId,
                timezone: timezone,
                userType: AuthUserType.GLOBAL,
            },
            {
                expiresIn: '7d',
                secret: this.config.get<string>('secret.refresh'),
            },
        );
        const [, status] = await this.applicantService.updateRtHash(
            applicantId,
            refreshToken,
        );
        if (status === false) return null;
        return { accessToken: accessToken, refreshToken: refreshToken };
    }

    async refreshApplicantToken(
        applicantId: string,
        refreshToken: string,
    ): Promise<[string, boolean, Tokens]> {
        try {
            const [msg, status, data] =
                await this.applicantService.findById(applicantId);
            if (!status) return [msg, false, null];
            const isValid = await bcrypt.compare(
                refreshToken,
                data.hashedRefreshToken,
            );
            if (!isValid) {
                return ['Access Denied', false, null];
            }
            const result = await this.getApplicantTokens(
                applicantId,
                data.timezone,
            );
            return ['Success', true, result];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async applicantLogout(applicantId: string): Promise<[string, boolean]> {
        try {
            const [msg, status] =
                await this.applicantService.deleteApplicantRtHash(applicantId);
            if (status === false) return [msg, false];
            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }
}
