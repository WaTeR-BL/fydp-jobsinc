import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailService } from './email.service';
import { RedisService } from '@app/common/redis/redis.service';
import { EmailController } from './email.controller';
import {
    TenantEmailTemplate,
    TenantEmailTemplateSchema,
} from '@app/common/schemas/tenant-email-template.schema';
import {
    MailboxConfig,
    MailboxConfigSchema,
} from '@app/common/schemas/mailbox-config.schema';
import { MailEncryptionService } from '../mail-ingestion/services/mail-encryption.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            {
                name: TenantEmailTemplate.name,
                schema: TenantEmailTemplateSchema,
            },
            { name: MailboxConfig.name, schema: MailboxConfigSchema },
        ]),
        TenantModule,
    ],
    controllers: [EmailController],
    providers: [EmailService, RedisService, MailEncryptionService],
    exports: [EmailService],
})
export class EmailModule {}
