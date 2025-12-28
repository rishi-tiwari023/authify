import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';
import { ValidationError } from '../utils/errors';

/**
 * TwoFactorService
 * 
 * Service class for handling Two-Factor Authentication (2FA) operations.
 * Provides TOTP-based authentication using the speakeasy library.
 * 
 * Features:
 * - Generate TOTP secrets for users
 * - Generate backup codes for account recovery
 * - Encrypt/decrypt 2FA secrets for secure storage
 * 
 * @class TwoFactorService
 */
export class TwoFactorService {
    private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
    private readonly ENCRYPTION_KEY: Buffer;
    private readonly BACKUP_CODE_LENGTH = 8;
    private readonly BACKUP_CODE_COUNT = 10;

    constructor() {
        // Use environment variable for encryption key or generate one
        const encryptionKey = process.env.TWO_FACTOR_ENCRYPTION_KEY;

        if (!encryptionKey) {
            throw new Error('TWO_FACTOR_ENCRYPTION_KEY environment variable is required');
        }

        // Ensure the key is 32 bytes for AES-256
        this.ENCRYPTION_KEY = crypto.scryptSync(encryptionKey, 'salt', 32);
    }

    /**
     * Generate a new TOTP secret for a user
     * 
     * @returns {speakeasy.GeneratedSecret} Generated secret object containing base32 encoded secret
     * @example
     * const secret = twoFactorService.generateSecret();
     * console.log(secret.base32); // "JBSWY3DPEHPK3PXP"
     */
    generateSecret(): speakeasy.GeneratedSecret {
        const secret = speakeasy.generateSecret({
            name: 'Authify',
            length: 32,
            issuer: 'Authify',
        });

        if (!secret || !secret.base32) {
            throw new ValidationError('Failed to generate 2FA secret');
        }

        return secret;
    }

    /**
     * Generate backup codes for account recovery
     * 
     * Generates a set of random alphanumeric codes that can be used
     * as an alternative to TOTP tokens for authentication.
     * 
     * @returns {string[]} Array of backup codes (unhashed)
     * @example
     * const codes = twoFactorService.generateBackupCodes();
     * // Returns: ["A1B2C3D4", "E5F6G7H8", ...]
     */
    generateBackupCodes(): string[] {
        const codes: string[] = [];

        for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
            const code = this.generateRandomCode(this.BACKUP_CODE_LENGTH);
            codes.push(code);
        }

        return codes;
    }

    /**
     * Generate a random alphanumeric code
     * 
     * @private
     * @param {number} length - Length of the code to generate
     * @returns {string} Random alphanumeric code
     */
    private generateRandomCode(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, chars.length);
            code += chars[randomIndex];
        }

        return code;
    }

    /**
     * Encrypt a 2FA secret for secure storage
     * 
     * Uses AES-256-GCM encryption to protect the TOTP secret.
     * The encrypted data includes an initialization vector (IV) and auth tag.
     * 
     * @param {string} secret - Plain text secret to encrypt
     * @returns {string} Encrypted secret in format: iv:authTag:encryptedData (hex encoded)
     * @throws {ValidationError} If encryption fails
     */
    encryptSecret(secret: string): string {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, this.ENCRYPTION_KEY, iv);

            let encrypted = cipher.update(secret, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            // Format: iv:authTag:encryptedData
            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        } catch (error) {
            throw new ValidationError('Failed to encrypt 2FA secret');
        }
    }

    /**
     * Decrypt a 2FA secret from storage
     * 
     * Decrypts a secret that was encrypted using the encryptSecret method.
     * 
     * @param {string} encryptedSecret - Encrypted secret in format: iv:authTag:encryptedData
     * @returns {string} Decrypted plain text secret
     * @throws {ValidationError} If decryption fails or format is invalid
     */
    decryptSecret(encryptedSecret: string): string {
        try {
            const parts = encryptedSecret.split(':');

            if (parts.length !== 3) {
                throw new Error('Invalid encrypted secret format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encryptedData = parts[2];

            const decipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, this.ENCRYPTION_KEY, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new ValidationError('Failed to decrypt 2FA secret');
        }
    }
}
