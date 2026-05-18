import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

export class TwoFactorAuthHelper {
    static generateSecret(email: string): {
        secret: string;
        otpauthUrl: string;
    } {
        const secretObj = speakeasy.generateSecret({
            name: `jobsinc: ${email}`,
        });

        return {
            secret: secretObj.base32,
            otpauthUrl: secretObj.otpauth_url,
        };
    }

    static async generateQRCode(otpauthUrl: string): Promise<string> {
        try {
            return await qrcode.toDataURL(otpauthUrl);
        } catch {
            throw new Error('Failed to generate QR code');
        }
    }

    static verifyToken(
        secret: string,
        token: string,
        window: number = 1,
    ): boolean {
        return speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window,
        });
    }

    static async generateSecretWithQR(email: string): Promise<{
        secret: string;
        qrCode: string;
    }> {
        const { secret, otpauthUrl } = this.generateSecret(email);
        const qrCode = await this.generateQRCode(otpauthUrl);

        return { secret, qrCode };
    }
}
