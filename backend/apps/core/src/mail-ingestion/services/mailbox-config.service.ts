import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { resolveMx } from 'dns/promises';
import {
    MailboxConfig,
    MailboxConfigDocument,
} from '@app/common/schemas/mailbox-config.schema';
import { ConfigService } from '@nestjs/config';
import { MailEncryptionService } from './mail-encryption.service';
import { ConnectorFactory } from '../connectors/connector.factory';
import {
    TestMailboxDto,
    UpsertMailboxConfigDto,
    ToggleMailboxDto,
} from '../dto/mailbox-config.dto';

@Injectable()
export class MailboxConfigService {
    private readonly logger = new Logger(MailboxConfigService.name);
    private readonly restrictedEmailDomains: string[];

    constructor(
        @InjectModel(MailboxConfig.name)
        private readonly configModel: Model<MailboxConfigDocument>,
        private readonly encryptionService: MailEncryptionService,
        private config: ConfigService,
    ) {
        this.restrictedEmailDomains = this.config.get<string[]>(
            'email.restricted_domains',
        );
    }

    async getForTenant(
        tenantId: string,
    ): Promise<[string, boolean, Record<string, any> | null]> {
        try {
            const config = await this.configModel
                .findOne({ tenantId: new Types.ObjectId(tenantId) })
                .lean();

            if (!config) return ['No mailbox configured', false, null];

            return [
                'Success',
                true,
                {
                    imapHost: config.imapHost,
                    imapPort: config.imapPort,
                    imapUser: config.imapUser,
                    useSSL: config.useSSL,
                    isActive: config.isActive,
                    isVerified: config.isVerified,
                    verifiedAt: config.verifiedAt,
                },
            ];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async testConnection(dto: TestMailboxDto): Promise<[string, boolean]> {
        const validationError = await this.validateDomain(dto.imapUser);
        if (validationError) return [validationError, false];

        return this.attemptImapConnection({
            imapHost: dto.imapHost,
            imapPort: dto.imapPort,
            useSSL: dto.useSSL ?? true,
            imapUser: dto.imapUser,
            decryptedPassword: dto.imapPassword,
        });
    }

    async upsert(
        tenantId: string,
        dto: UpsertMailboxConfigDto,
    ): Promise<[string, boolean]> {
        const validationError = await this.validateDomain(dto.imapUser);
        if (validationError) return [validationError, false];

        const [connMsg, connOk] = await this.attemptImapConnection({
            imapHost: dto.imapHost,
            imapPort: dto.imapPort,
            useSSL: dto.useSSL,
            imapUser: dto.imapUser,
            decryptedPassword: dto.imapPassword,
        });

        if (!connOk) return [connMsg, false];

        try {
            const encryptedPassword = this.encryptionService.encrypt(
                dto.imapPassword,
            );

            await this.configModel.findOneAndUpdate(
                { tenantId: new Types.ObjectId(tenantId) },
                {
                    $set: {
                        imapHost: dto.imapHost,
                        imapPort: dto.imapPort,
                        imapUser: dto.imapUser,
                        imapPasswordEnc: encryptedPassword,
                        useSSL: dto.useSSL,
                        isVerified: true,
                        verifiedAt: new Date(),
                        isActive: true,
                        // Reset UID on credential change to re-scan from current state
                        lastSeenUid: 0,
                    },
                },
                { upsert: true, new: true },
            );

            return ['Mailbox configuration saved', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async toggle(
        tenantId: string,
        dto: ToggleMailboxDto,
    ): Promise<[string, boolean]> {
        try {
            const result = await this.configModel.updateOne(
                { tenantId: new Types.ObjectId(tenantId) },
                { $set: { isActive: dto.isActive } },
            );
            if (result.matchedCount === 0)
                return ['Mailbox config not found', false];
            return ['Success', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async remove(tenantId: string): Promise<[string, boolean]> {
        try {
            await this.configModel.deleteOne({
                tenantId: new Types.ObjectId(tenantId),
            });
            return ['Mailbox configuration removed', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    private async validateDomain(emailAddress: string): Promise<string | null> {
        const domain = emailAddress.split('@')[1]?.toLowerCase();
        if (!domain) return 'Invalid email address format';

        if (this.restrictedEmailDomains.includes(domain)) {
            return `Consumer email domains (${domain}) are not allowed. Use a Google Workspace or corporate domain.`;
        }

        try {
            const records = await resolveMx(domain);
            if (!records || records.length === 0) {
                return `Domain "${domain}" has no MX records — not a valid mail domain`;
            }
        } catch {
            return `Domain "${domain}" could not be resolved — ensure it has valid DNS MX records`;
        }

        return null;
    }

    private async attemptImapConnection(params: {
        imapHost: string;
        imapPort: number;
        useSSL: boolean;
        imapUser: string;
        decryptedPassword: string;
    }): Promise<[string, boolean]> {
        const connector = ConnectorFactory.create(params);
        try {
            await connector.connect();
            // Just verify INBOX is accessible — no fetch needed for a connection test.
            // (Fetching with a large UID overflows the 32-bit IMAP UID limit on servers like Gmail)
            await connector.verifyInbox();
            return ['Connection successful', true];
        } catch (err) {
            this.logger.warn(`IMAP test failed: ${err.message}`);
            return [`IMAP connection failed: ${err.message}`, false];
        } finally {
            await connector.disconnect();
        }
    }
}
