import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ConnectionConfig } from '../interfaces/db-adapter.interface';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

@Injectable()
export class CredentialEncryptionService {
    private readonly key: Buffer;

    constructor(private readonly configService: ConfigService) {
        const secret = this.configService.get<string>(
            'integration.encryptionKey',
        );
        if (!secret || secret.length < 32) {
            throw new Error(
                'INTEGRATION_ENCRYPTION_KEY env variable must be at least 32 characters long.',
            );
        }
        this.key = Buffer.from(secret.slice(0, 32), 'utf8');
    }

    encrypt(connection: ConnectionConfig): string {
        const iv = randomBytes(IV_LENGTH);
        const cipher = createCipheriv(ALGORITHM, this.key, iv);
        const plaintext = JSON.stringify(connection);
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        // Format: iv:tag:ciphertext (all hex-encoded)
        return [
            iv.toString('hex'),
            tag.toString('hex'),
            encrypted.toString('hex'),
        ].join(':');
    }

    decrypt(ciphertext: string): ConnectionConfig {
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
        return JSON.parse(decrypted.toString('utf8')) as ConnectionConfig;
    }
}
