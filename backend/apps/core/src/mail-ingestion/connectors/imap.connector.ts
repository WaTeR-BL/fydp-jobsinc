import { Logger } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import {
    IMailConnector,
    RawEmail,
    RawEmailAttachment,
} from '../interfaces/mail-connector.interface';

export interface ImapConnectionConfig {
    host: string;
    port: number;
    useSSL: boolean;
    user: string;
    password: string;
}

export class ImapConnector implements IMailConnector {
    private readonly client: ImapFlow;
    private maxUid = 0;
    private readonly logger = new Logger(ImapConnector.name);

    constructor(config: ImapConnectionConfig) {
        this.client = new ImapFlow({
            host: config.host,
            port: config.port,
            secure: config.useSSL,
            auth: {
                user: config.user,
                pass: config.password,
            },
            logger: false,
        });
    }

    async connect(): Promise<void> {
        await this.client.connect();
    }

    async verifyInbox(): Promise<void> {
        const lock = await this.client.getMailboxLock('INBOX');
        lock.release();
    }

    async fetchNewMessages(sinceUid: number): Promise<RawEmail[]> {
        const lock = await this.client.getMailboxLock('INBOX');
        const messages: RawEmail[] = [];

        try {
            // Build UID range: fetch UIDs greater than sinceUid
            const range = sinceUid > 0 ? `${sinceUid + 1}:*` : '1:*';

            for await (const msg of this.client.fetch(
                range,
                { uid: true, source: true },
                { uid: true },
            )) {
                // imapflow may include the boundary UID itself — skip it
                if (msg.uid <= sinceUid) continue;

                let parsed: Awaited<ReturnType<typeof simpleParser>>;
                try {
                    parsed = await simpleParser(msg.source);
                } catch (parseErr) {
                    this.logger.warn(
                        `Failed to parse message uid=${msg.uid}: ${parseErr.message}`,
                    );
                    continue;
                }

                const attachments: RawEmailAttachment[] = (
                    parsed.attachments ?? []
                ).map((a) => ({
                    filename: a.filename ?? `attachment-${msg.uid}`,
                    contentType: a.contentType ?? 'application/octet-stream',
                    contentBase64: (a.content as Buffer).toString('base64'),
                    size: a.size ?? (a.content as Buffer).byteLength,
                }));

                const fromAddr =
                    parsed.from?.value?.[0]?.address?.toLowerCase().trim() ??
                    '';
                const fromName = parsed.from?.value?.[0]?.name ?? '';

                // Extract To: and Delivered-To: from parsed headers
                const toFull = parsed.to
                    ? Array.isArray(parsed.to)
                        ? parsed.to
                              .flatMap((a) => a.value)
                              .map((v) => v.address ?? '')
                              .join(', ')
                        : ((parsed.to as any).text ?? '')
                    : '';

                // headers.get() can return string | string[] | StructuredHeader
                // normalise to a plain string or undefined
                const rawDeliveredTo = parsed.headers?.get('delivered-to');
                const deliveredTo: string | undefined = (() => {
                    if (!rawDeliveredTo) return undefined;
                    if (Array.isArray(rawDeliveredTo))
                        return typeof rawDeliveredTo[0] === 'string'
                            ? rawDeliveredTo[0]
                            : undefined;
                    if (typeof rawDeliveredTo === 'string')
                        return rawDeliveredTo;
                    return undefined;
                })();

                messages.push({
                    uid: msg.uid,
                    from: fromAddr,
                    fromName,
                    toFull,
                    deliveredTo,
                    subject: parsed.subject ?? '',
                    date: parsed.date ?? new Date(),
                    attachments,
                    textBody: parsed.text ?? undefined,
                });

                if (msg.uid > this.maxUid) {
                    this.maxUid = msg.uid;
                }
            }
        } finally {
            lock.release();
        }

        return messages;
    }

    getMaxUid(): number {
        return this.maxUid;
    }

    async disconnect(): Promise<void> {
        try {
            await this.client.logout();
        } catch {
            // ignore disconnect errors
        }
    }
}
