import { RawEmail } from './mail-connector.interface';

export interface MailJobPayload {
    tenantId: string;
    mailboxConfigId: string;
    email: RawEmail;
}
