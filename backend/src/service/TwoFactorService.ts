import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
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

    /**
     * Verify a TOTP token against a secret
     * 
     * Validates a 6-digit TOTP token using the speakeasy library.
     * Uses a 30-second time window (standard TOTP configuration).
     * Allows a window of ±1 step to account for time drift.
     * 
     * @param {string} secret - The base32 encoded TOTP secret
     * @param {string} token - The 6-digit token to verify
     * @returns {boolean} True if token is valid, false otherwise
     * @throws {ValidationError} If secret or token format is invalid
     * @example
     * const isValid = twoFactorService.verifyToken(secret, '123456');
     */
    verifyToken(secret: string, token: string): boolean {
        try {
            // Validate input
            if (!secret || typeof secret !== 'string') {
                throw new ValidationError('Invalid secret provided');
            }

            if (!token || typeof token !== 'string') {
                throw new ValidationError('Invalid token provided');
            }

            // Remove any whitespace or dashes from token
            const cleanToken = token.replace(/[\s-]/g, '');

            // Validate token format (must be 6 digits)
            if (!/^\d{6}$/.test(cleanToken)) {
                return false;
            }

            // Verify the token with a 30-second window and ±1 step tolerance
            const verified = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: cleanToken,
                window: 1, // Allow ±1 time step (30 seconds before/after)
            });

            return verified;
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            // Invalid token format or verification error
            return false;
        }
    }

    /**
     * Generate a QR code for TOTP setup
     * 
     * Creates a QR code image that can be scanned by authenticator apps
     * (Google Authenticator, Authy, etc.) to add the TOTP secret.
     * 
     * @param {string} secret - The base32 encoded TOTP secret
     * @param {string} email - User's email address for identification
     * @returns {Promise<string>} Data URL of the QR code image
     * @throws {ValidationError} If QR code generation fails
     * @example
     * const qrCodeUrl = await twoFactorService.generateQRCode(secret, 'user@example.com');
     * // Returns: "data:image/png;base64,iVBORw0KGgoAAAANS..."
     */
    async generateQRCode(secret: string, email: string): Promise<string> {
        try {
            // Validate input
            if (!secret || typeof secret !== 'string') {
                throw new ValidationError('Invalid secret provided');
            }

            if (!email || typeof email !== 'string') {
                throw new ValidationError('Invalid email provided');
            }

            // Generate otpauth:// URL
            // Format: otpauth://totp/Issuer:Email?secret=SECRET&issuer=Issuer
            const issuer = 'Authify';
            const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

            // Generate QR code as data URL
            const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                width: 300,
                margin: 1,
            });

            return qrCodeDataUrl;
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new ValidationError('Failed to generate QR code');
        }
    }

    /**
 * Verify a backup code for a user
 * 
 * Checks if the provided backup code matches any of the user's stored backup codes.
 * Backup codes are stored as hashed values for security.
 * Once a backup code is used, it should be removed from the user's backup codes.
 * 
 * @param {any} user - User object containing twoFactorBackupCodes array
 * @param {string} code - The backup code to verify
 * @returns {boolean} True if backup code is valid, false otherwise
 * @throws {ValidationError} If user or code format is invalid
 * @example
 * const isValid = twoFactorService.verifyBackupCode(user, 'A1B2C3D4');
 */
    verifyBackupCode(user: any, code: string): boolean {
        try {
            // Validate input
            if (!user) {
                throw new ValidationError('User is required');
            }

            if (!code || typeof code !== 'string') {
                throw new ValidationError('Invalid backup code provided');
            }

            // Check if user has backup codes
            if (!user.twoFactorBackupCodes || !Array.isArray(user.twoFactorBackupCodes)) {
                return false;
            }

            if (user.twoFactorBackupCodes.length === 0) {
                return false;
            }

            // Remove whitespace and convert to uppercase for comparison
            const cleanCode = code.replace(/\s/g, '').toUpperCase();

            // Validate backup code format (8 alphanumeric characters)
            if (!/^[A-Z0-9]{8}$/.test(cleanCode)) {
                return false;
            }

            // Check if the code exists in the user's backup codes
            // Note: In production, backup codes should be hashed before storage
            // For now, we're doing a direct comparison
            const codeExists = user.twoFactorBackupCodes.includes(cleanCode);

            return codeExists;
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            return false;
        }
    }

    /**
     * Remove a used backup code from the user's backup codes
     * 
     * After a backup code is successfully used for authentication,
     * it should be removed to prevent reuse.
     * 
     * @param {any} user - User object containing twoFactorBackupCodes array
     * @param {string} code - The backup code to remove
     * @returns {string[]} Updated array of backup codes
     * @throws {ValidationError} If user or code format is invalid
     */
    removeBackupCode(user: any, code: string): string[] {
        if (!user || !user.twoFactorBackupCodes) {
            throw new ValidationError('User has no backup codes');
        }

        const cleanCode = code.replace(/\s/g, '').toUpperCase();

        // Filter out the used code
        const updatedCodes = user.twoFactorBackupCodes.filter(
            (backupCode: string) => backupCode !== cleanCode
        );

        return updatedCodes;
    }
}
