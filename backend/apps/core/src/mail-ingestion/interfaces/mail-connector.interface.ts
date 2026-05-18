export interface RawEmailAttachment {
    filename: string;
    contentType: string;
    /** Base64-encoded content — safe for BullMQ JSON serialization */
    contentBase64: string;
    size: number;
}

export interface RawEmail {
    uid: number;
    /** Normalized lowercase sender address */
    from: string;
    /** Display name parsed from the From: header */
    fromName: string;
    /** Full original To: header value — preserves +tag */
    toFull: string;
    /** Delivered-To: header value — fallback for Gmail tag routing */
    deliveredTo?: string;
    subject: string;
    date: Date;
    attachments: RawEmailAttachment[];
    textBody?: string;
}

export interface IMailConnector {
    connect(): Promise<void>;
    /** Open and immediately release INBOX lock — used for connection testing */
    verifyInbox(): Promise<void>;
    fetchNewMessages(sinceUid: number): Promise<RawEmail[]>;
    getMaxUid(): number;
    disconnect(): Promise<void>;
}
