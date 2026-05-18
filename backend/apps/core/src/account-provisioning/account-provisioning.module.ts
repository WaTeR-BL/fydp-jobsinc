import { Module } from '@nestjs/common';
import { AccountProvisioningController } from './account-provisioning.controller';
import { AccountProvisioningService } from './account-provisioning.service';
import { UserModule } from '../user/user.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { TenantModule } from '../tenant/tenant.module';
import { MediaManagerModule } from '@app/common/media-manager/media-manager.module';
import { UrlVerificationModule } from '../url-verification/url-verification.module';
import { EmailModule } from '../email/email.module';
import { BillingModule } from '../billing/billing.module';

@Module({
    controllers: [AccountProvisioningController],
    providers: [AccountProvisioningService],
    imports: [
        UserModule,
        SubscriptionModule,
        TenantModule,
        MediaManagerModule,
        UrlVerificationModule,
        EmailModule,
        BillingModule,
    ],
})
export class AccountProvisioningModule {}
