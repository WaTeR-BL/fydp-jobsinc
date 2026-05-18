import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Standalone AES-256-GCM encryption service for IMAP passwords.
 * Uses the same INTEGRATION_ENCRYPTION_KEY as CredentialEncryptionService
 * but operates on plain strings rather than ConnectionConfig objects.
 */
@Injectable()
export class MailEncryptionService {
    private readonly key: Buffer;

    constructor(private readonly configService: ConfigService) {
        const secret = this.configService.get<string>(
            'integration.encryptionKey',
        );
        if (!secret || secret.length < 32) {
            throw new Error(
                'INTEGRATION_ENCRYPTION_KEY must be at least 32 characters.',
            );
        }
        this.key = Buffer.from(secret.slice(0, 32), 'utf8');
    }

    encrypt(plaintext: string): string {
        const iv = randomBytes(IV_LENGTH);
        const cipher = createCipheriv(ALGORITHM, this.key, iv);
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        return [
            iv.toString('hex'),
            tag.toString('hex'),
            encrypted.toString('hex'),
        ].join(':');
    }

    decrypt(ciphertext: string): string {
        const parts = ciphertext.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted credential format.');
        }
        const [ivHex, tagHex, encHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const encrypted = Buffer.from(encHex, 'hex');

        const decipher = createDecipheriv(ALGORITHM, this.key, iv);
        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    }
}
