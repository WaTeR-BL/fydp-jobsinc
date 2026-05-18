import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { TenantService } from '../tenant/tenant.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { TenantOnboardingDto } from './dto/account-provisioning.dto';
import { CreateTenantDto } from '../tenant/dto/tenant.dto';
import { CreateUserDto } from '../user/dto/user.dto';
import { UserRole } from '@app/common/enums/app.enums';
import { MediaManagerService } from '@app/common/media-manager/media-manager.service';
import { UrlVerificationService } from '../url-verification/url-verification.service';
import { EmailService } from '../email/email.service';
import { PaymentService } from '../billing/payment.service';

@Injectable()
export class AccountProvisioningService {
    constructor(
        private readonly userService: UserService,
        private readonly tenantService: TenantService,
        private readonly subscriptionService: SubscriptionService,
        private readonly urlVerificationService: UrlVerificationService,
        private readonly emailService: EmailService,
        private readonly mediaService: MediaManagerService,
        private readonly paymentService: PaymentService,
        @InjectConnection() private readonly connection: Connection,
    ) {}

    async tenantOnboarding(
        dto: TenantOnboardingDto,
        media: Express.Multer.File,
    ): Promise<[string, boolean]> {
        const session = await this.connection.startSession();
        try {
            let result = ['Transaction Failure', false] as [string, boolean];

            const valid = await this.tenantService.validateDomain(
                dto.emailAddress,
            );
            if (!valid) return ['domain already in use', false];

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

            const [urlMessage, urlSuccess, urlResult] =
                await this.urlVerificationService.getCachedUrlVerification(
                    dto.websiteUrl,
                );

            if (!urlSuccess || !urlResult?.valid) {
                return [!urlSuccess ? urlMessage : urlResult.reason, false];
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

            if (!allowedTypes.includes(media.mimetype)) {
                throw new Error('Only JPEG, PNG, or WEBP images are allowed');
            }

            const [msg, ok, img] = await this.mediaService.upload(media);

            if (!ok || !img) {
                throw new Error(msg || 'Media upload failed');
            }

            await session.withTransaction(async () => {
                const ten: CreateTenantDto = {
                    address: dto.companyAddress,
                    emailAddress: dto.emailAddress,
                    name: dto.companyName,
                    websiteUrl: dto.websiteUrl,
                    contactEmail: dto.contactEmail,
                    logoUrl: img?.url ?? null,
                    domain: emailResult.domain,
                };

                const [msg1, ok1, tenant] =
                    await this.tenantService.createTenant(ten, session);

                if (!ok1) throw new Error(msg1);

                const [stripeMsg, stripeOk] =
                    await this.paymentService.createStripeCustomer(
                        tenant.id.toString(),
                        dto.emailAddress,
                        dto.companyName,
                        session,
                    );
                if (!stripeOk) throw new Error(stripeMsg);

                const user: CreateUserDto = {
                    emailAddress: dto.emailAddress,
                    password: dto.password,
                    name: dto.fullName,
                    roles: [UserRole.ADMIN, UserRole.INTERVIEWER, UserRole.MANAGER],
                    timezone: dto.timezone,
                    enable2FA: true,
                };

                const [msg3, ok3] = await this.userService.createUser(
                    user,
                    tenant.id.toString(),
                    true,
                    session,
                );
                if (!ok3) throw new Error(msg3);

                result = ['Success', true];
            });
            return result;
        } catch (error) {
            return [error.message, false];
        } finally {
            await session.endSession();
        }
    }
}
