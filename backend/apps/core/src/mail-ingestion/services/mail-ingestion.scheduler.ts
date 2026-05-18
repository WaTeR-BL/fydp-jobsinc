import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    MailboxConfig,
    MailboxConfigDocument,
} from '@app/common/schemas/mailbox-config.schema';
import { ConnectorFactory } from '../connectors/connector.factory';
import { MailEncryptionService } from './mail-encryption.service';
import { MailIngestionQueue } from '../queue/mail-ingestion.queue';

@Injectable()
export class MailIngestionScheduler {
    private readonly logger = new Logger(MailIngestionScheduler.name);
    /** Tracks in-progress tenant polls within this process instance */
    private readonly runningPolls = new Set<string>();

    constructor(
        @InjectModel(MailboxConfig.name)
        private readonly mailboxModel: Model<MailboxConfigDocument>,
        private readonly encryptionService: MailEncryptionService,
        private readonly mailIngestionQueue: MailIngestionQueue,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    async pollAllMailboxes(): Promise<void> {
        const configs = await this.mailboxModel
            .find({ isActive: true, isVerified: true })
            .lean();

        this.logger.log(`Polling ${configs.length} active mailbox(es)`);

        for (const config of configs) {
            const tenantKey = config.tenantId.toString();
            if (this.runningPolls.has(tenantKey)) {
                this.logger.log(
                    `Skipping tenant ${tenantKey} — poll already running`,
                );
                continue;
            }
            // fire-and-forget per tenant to avoid blocking the cron runner
            this.pollMailbox(config).catch((err) =>
                this.logger.error(
                    `Unhandled error polling tenant ${tenantKey}: ${err.message}`,
                ),
            );
        }
    }

    private async pollMailbox(config: MailboxConfigDocument): Promise<void> {
        const tenantKey = config.tenantId.toString();
        this.runningPolls.add(tenantKey);

        let decryptedPassword: string;
        try {
            decryptedPassword = this.encryptionService.decrypt(
                config.imapPasswordEnc,
            );
        } catch {
            this.logger.error(
                `Failed to decrypt password for tenant ${tenantKey}`,
            );
            this.runningPolls.delete(tenantKey);
            return;
        }

        const connector = ConnectorFactory.create({
            imapHost: config.imapHost,
            imapPort: config.imapPort,
            useSSL: config.useSSL,
            imapUser: config.imapUser,
            decryptedPassword,
        });

        try {
            await connector.connect();
            const emails = await connector.fetchNewMessages(config.lastSeenUid);

            if (emails.length === 0) {
                this.logger.debug(`No new emails for tenant ${tenantKey}`);
                return;
            }

            for (const email of emails) {
                await this.mailIngestionQueue.enqueue({
                    tenantId: tenantKey,
                    mailboxConfigId: config._id.toString(),
                    email,
                });
            }

            const newMaxUid = connector.getMaxUid();
            await this.mailboxModel.updateOne(
                { _id: config._id },
                { $set: { lastSeenUid: newMaxUid } },
            );

            this.logger.log(
                `Tenant ${tenantKey}: queued ${emails.length} email(s), lastSeenUid=${newMaxUid}`,
            );
        } catch (err) {
            // Do NOT update lastSeenUid on IMAP error — will retry next cycle
            this.logger.error(
                `IMAP poll failed for tenant ${tenantKey}: ${err.message}`,
            );
        } finally {
            await connector.disconnect();
            this.runningPolls.delete(tenantKey);
        }
    }
}
