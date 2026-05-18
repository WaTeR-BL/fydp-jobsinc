import { IMailConnector } from '../interfaces/mail-connector.interface';
import { ImapConnector } from './imap.connector';

export interface MailboxCredentials {
    imapHost: string;
    imapPort: number;
    useSSL: boolean;
    imapUser: string;
    decryptedPassword: string;
}

export class ConnectorFactory {
    static create(creds: MailboxCredentials): IMailConnector {
        return new ImapConnector({
            host: creds.imapHost,
            port: creds.imapPort,
            useSSL: creds.useSSL,
            user: creds.imapUser,
            password: creds.decryptedPassword,
        });
    }
}
