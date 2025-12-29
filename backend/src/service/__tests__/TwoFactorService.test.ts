import { TwoFactorService } from '../TwoFactorService';
import { ValidationError } from '../../utils/errors';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

// Mock speakeasy and qrcode
jest.mock('speakeasy');
jest.mock('qrcode');

describe('TwoFactorService', () => {
    let twoFactorService: TwoFactorService;
    // Mock encryption key for tests
    const MOCK_ENCRYPTION_KEY = '0'.repeat(64); // 32 bytes in hex is 64 chars, but scryptSync handles the salt derivation

    beforeAll(() => {
        // Set environment variable for the service
        process.env.TWO_FACTOR_ENCRYPTION_KEY = 'test-encryption-key';
    });

    beforeEach(() => {
        jest.clearAllMocks();
        twoFactorService = new TwoFactorService();
    });

    afterAll(() => {
        delete process.env.TWO_FACTOR_ENCRYPTION_KEY;
    });

    describe('generateSecret', () => {
        it('should generate a secret successfully', () => {
            const mockSecret = {
                ascii: 'abc',
                hex: '616263',
                base32: 'MFRGGIDBEB2GQZJA',
                otpauth_url: 'otpauth://totp/Authify?secret=MFRGGIDBEB2GQZJA'
            };
            (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);

            const result = twoFactorService.generateSecret();

            expect(speakeasy.generateSecret).toHaveBeenCalledWith({
                name: 'Authify',
                length: 32,
                issuer: 'Authify',
            });
            expect(result).toBe(mockSecret);
        });

        it('should throw ValidationError if secret generation fails', () => {
            (speakeasy.generateSecret as jest.Mock).mockReturnValue(null);

            expect(() => twoFactorService.generateSecret()).toThrow(ValidationError);
        });
    });

    describe('generateBackupCodes', () => {
        it('should generate the correct number of backup codes', () => {
            const codes = twoFactorService.generateBackupCodes();

            expect(codes).toHaveLength(10);
            codes.forEach(code => {
                expect(code).toHaveLength(8);
                expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
            });
        });

        it('should generate unique codes (statistically checking diversity)', () => {
            const codes = twoFactorService.generateBackupCodes();
            const uniqueCodes = new Set(codes);
            expect(uniqueCodes.size).toBe(10);
        });
    });

    describe('encryptSecret and decryptSecret', () => {
        it('should encrypt and decrypt a secret correctly', () => {
            const secret = 'MFRGGIDBEB2GQZJA';
            const encrypted = twoFactorService.encryptSecret(secret);

            expect(encrypted).not.toBe(secret);
            expect(encrypted).toContain(':'); // Should have IV, AuthTag, and Content

            const decrypted = twoFactorService.decryptSecret(encrypted);
            expect(decrypted).toBe(secret);
        });

        it('should throw error when decrypting invalid format', () => {
            expect(() => twoFactorService.decryptSecret('invalid-format')).toThrow(ValidationError);
        });

        it('should throw error when decrypting corrupted data', () => {
            // Correct format but invalid data (iv:tag:data)
            const badData = '1234567890abcdef1234567890abcdef:1234567890abcdef1234567890abcdef:1234567890abcdef';
            expect(() => twoFactorService.decryptSecret(badData)).toThrow(ValidationError);
        });
    });

    describe('verifyToken', () => {
        const secret = 'MFRGGIDBEB2GQZJA';

        it('should return true for valid token', () => {
            (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

            const result = twoFactorService.verifyToken(secret, '123456');

            expect(speakeasy.totp.verify).toHaveBeenCalledWith({
                secret,
                encoding: 'base32',
                token: '123456',
                window: 1
            });
            expect(result).toBe(true);
        });

        it('should return false for invalid token', () => {
            (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

            const result = twoFactorService.verifyToken(secret, '123456');
            expect(result).toBe(false);
        });

        it('should handle token with whitespace or dashes', () => {
            (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

            twoFactorService.verifyToken(secret, '123 456');
            expect(speakeasy.totp.verify).toHaveBeenCalledWith(expect.objectContaining({
                token: '123456'
            }));

            twoFactorService.verifyToken(secret, '123-456');
            expect(speakeasy.totp.verify).toHaveBeenCalledWith(expect.objectContaining({
                token: '123456'
            }));
        });

        it('should return false for malformed token (lengths != 6)', () => {
            expect(twoFactorService.verifyToken(secret, '12345')).toBe(false);
            expect(twoFactorService.verifyToken(secret, '1234567')).toBe(false);
            expect(twoFactorService.verifyToken(secret, 'abcdef')).toBe(false);
        });

        it('should validate inputs', () => {
            expect(() => twoFactorService.verifyToken('', '123456')).toThrow(ValidationError);
            expect(() => twoFactorService.verifyToken(secret, '')).toThrow(ValidationError);
        });
    });

    describe('verifyBackupCode', () => {
        const user = {
            twoFactorBackupCodes: ['ABCDEF12', '12345678']
        };

        it('should return true for valid backup code', () => {
            const result = twoFactorService.verifyBackupCode(user, 'ABCDEF12');
            expect(result).toBe(true);
        });

        it('should return true for valid backup code with lowercase/whitespace', () => {
            const result = twoFactorService.verifyBackupCode(user, 'ab cd ef 12');
            expect(result).toBe(true);
        });

        it('should return false for invalid backup code', () => {
            const result = twoFactorService.verifyBackupCode(user, 'ZZZZZZZZ');
            expect(result).toBe(false);
        });

        it('should return false if user has no backup codes', () => {
            expect(twoFactorService.verifyBackupCode({}, 'ABCDEF12')).toBe(false);
            expect(twoFactorService.verifyBackupCode({ twoFactorBackupCodes: [] }, 'ABCDEF12')).toBe(false);
        });

        it('should validate inputs', () => {
            expect(() => twoFactorService.verifyBackupCode(null, 'code')).toThrow(ValidationError);
            expect(() => twoFactorService.verifyBackupCode(user, '')).toThrow(ValidationError);
        });
    });

    describe('removeBackupCode', () => {
        const user = {
            twoFactorBackupCodes: ['ABCDEF12', '12345678']
        };

        it('should remove the used code', () => {
            const updatedCodes = twoFactorService.removeBackupCode(user, 'ABCDEF12');
            expect(updatedCodes).toHaveLength(1);
            expect(updatedCodes).not.toContain('ABCDEF12');
            expect(updatedCodes).toContain('12345678');
        });

        it('should handle case insensitivity and whitespace', () => {
            const updatedCodes = twoFactorService.removeBackupCode(user, 'ab cd ef 12');
            expect(updatedCodes).not.toContain('ABCDEF12');
        });

        it('should throw error if user has no codes', () => {
            expect(() => twoFactorService.removeBackupCode({}, 'code')).toThrow(ValidationError);
        });
    });

    describe('generateQRCode', () => {
        it('should generate QR code data URL', async () => {
            const secret = 'MFRGGIDBEB2GQZJA';
            const email = 'test@example.com';
            const mockDataUrl = 'data:image/png;base64,mockcode';

            (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockDataUrl);

            const result = await twoFactorService.generateQRCode(secret, email);

            expect(result).toBe(mockDataUrl);
            expect(QRCode.toDataURL).toHaveBeenCalledWith(
                expect.stringContaining(`otpauth://totp/Authify:${encodeURIComponent(email)}`),
                expect.any(Object)
            );
            expect(QRCode.toDataURL).toHaveBeenCalledWith(
                expect.stringContaining(`secret=${secret}`),
                expect.any(Object)
            );
        });

        it('should throw ValidationError if QR generation fails', async () => {
            (QRCode.toDataURL as jest.Mock).mockRejectedValue(new Error('QR Error'));

            await expect(twoFactorService.generateQRCode('secret', 'email')).rejects.toThrow(ValidationError);
        });

        it('should validate inputs', async () => {
            await expect(twoFactorService.generateQRCode('', 'email')).rejects.toThrow(ValidationError);
            await expect(twoFactorService.generateQRCode('secret', '')).rejects.toThrow(ValidationError);
        });
    });
});
