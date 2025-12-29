import { UserRepository } from '../repository/UserRepository';
import { User, UserRole } from '../model/User';
import * as bcrypt from 'bcrypt';
import { ValidationError, NotFoundError } from '../utils/errors';
import { isValidEmail, isValidPassword, validateName } from '../utils/validation';
import { PasswordResetTokenRepository } from '../repository/PasswordResetTokenRepository';
import { PasswordResetToken } from '../model/PasswordResetToken';
import { EmailVerificationTokenRepository } from '../repository/EmailVerificationTokenRepository';
import { EmailVerificationToken } from '../model/EmailVerificationToken';
import { EmailService } from './EmailService';
import { TwoFactorService } from './TwoFactorService';
import * as crypto from 'crypto';

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  private userRepository: UserRepository;
  private passwordResetTokenRepository: PasswordResetTokenRepository;
  private emailVerificationTokenRepository: EmailVerificationTokenRepository;
  private emailService: EmailService;
  private twoFactorService: TwoFactorService;
  private readonly saltRounds = 10;

  constructor() {
    this.userRepository = new UserRepository();
    this.passwordResetTokenRepository = new PasswordResetTokenRepository();
    this.emailVerificationTokenRepository = new EmailVerificationTokenRepository();
    this.emailService = new EmailService();
    this.twoFactorService = new TwoFactorService();
  }

  async signup(data: SignupData): Promise<User> {
    // Validate email
    if (!isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password
    const passwordValidation = isValidPassword(data.password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.error!);
    }

    // Validate name
    const nameValidation = validateName(data.name);
    if (!nameValidation.valid) {
      throw new ValidationError(nameValidation.error!);
    }

    const existingUser = await this.userRepository.findByEmail(data.email.toLowerCase().trim());
    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(data.password, this.saltRounds);
    const user = await this.userRepository.create({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      role: UserRole.USER,
    });

    // Fire-and-forget welcome email (non-blocking for signup)
    this.emailService
      .sendWelcomeEmail(user.email, user.name)
      .catch((error) => console.error('Failed to send welcome email:', error));

    // Send email verification (non-blocking)
    this.sendVerificationEmail(user.id, user.email, user.name).catch((error) =>
      console.error('Failed to send verification email:', error)
    );

    return user;
  }

  async sendVerificationEmail(userId: string, email: string, name: string): Promise<EmailVerificationToken> {
    // Delete any existing verification tokens for this user
    await this.emailVerificationTokenRepository.deleteByUserId(userId);

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    const verificationToken = await this.emailVerificationTokenRepository.create({
      token,
      userId,
      expiresAt,
      used: false,
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, name, token);
    } catch (error) {
      // Log error but don't fail the request (token is still created)
      console.error('Failed to send verification email:', error);
    }

    return verificationToken;
  }

  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await this.emailVerificationTokenRepository.findByToken(token);
    if (!verificationToken) {
      throw new ValidationError('Invalid or expired verification token');
    }

    if (verificationToken.used) {
      throw new ValidationError('Verification token has already been used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new ValidationError('Verification token has expired');
    }

    // Mark email as verified
    await this.userRepository.update(verificationToken.userId, { emailVerified: true });

    // Mark token as used
    await this.emailVerificationTokenRepository.markAsUsed(verificationToken.id);
  }

  async login(data: LoginData): Promise<User | { requires2FA: true; userId: string } | null> {
    if (!isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format');
    }

    const user = await this.userRepository.findByEmail(data.email.toLowerCase().trim());
    if (!user) {
      return null;
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    if (user.twoFactorEnabled) {
      return { requires2FA: true, userId: user.id };
    }

    return user;
  }

  async verifyLoginWith2FA(userId: string, token: string): Promise<User | null> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return null;
    }

    // Attempt to verify with TOTP token
    const decryptedSecret = this.twoFactorService.decryptSecret(user.twoFactorSecret);
    let isValid = this.twoFactorService.verifyToken(decryptedSecret, token);

    // If TOTP fails, check backup codes
    if (!isValid) {
      isValid = this.twoFactorService.verifyBackupCode(user, token);
      if (isValid) {
        // If backup code used, remove it
        const updatedBackupCodes = this.twoFactorService.removeBackupCode(user, token);
        await this.userRepository.update(user.id, { twoFactorBackupCodes: updatedBackupCodes });
      }
    }

    if (!isValid) {
      return null;
    }

    return user;
  }

  async setup2FA(userId: string): Promise<{ secret: string; dataUrl: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new ValidationError('2FA is already enabled');
    }

    // Generate new secret
    const secret = this.twoFactorService.generateSecret();
    const encryptedSecret = this.twoFactorService.encryptSecret(secret.base32);

    // Save secret to user but keep 2FA disabled until verified
    await this.userRepository.update(user.id, { twoFactorSecret: encryptedSecret });

    // Generate QR code
    const dataUrl = await this.twoFactorService.generateQRCode(secret.base32, user.email);

    return {
      secret: secret.base32,
      dataUrl,
    };
  }

  async enable2FA(userId: string, token: string): Promise<string[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new ValidationError('2FA is already enabled');
    }

    if (!user.twoFactorSecret) {
      throw new ValidationError('2FA setup not initiated');
    }

    // Verify token
    const decryptedSecret = this.twoFactorService.decryptSecret(user.twoFactorSecret);
    const isValid = this.twoFactorService.verifyToken(decryptedSecret, token);

    if (!isValid) {
      throw new ValidationError('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.twoFactorService.generateBackupCodes();

    // Enable 2FA and save backup codes
    await this.userRepository.update(user.id, {
      twoFactorEnabled: true,
      twoFactorBackupCodes: backupCodes,
    });

    return backupCodes;
  }

  async disable2FA(userId: string, password: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new ValidationError('2FA is not enabled');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ValidationError('Invalid password');
    }

    // Disable 2FA and clear secret/codes
    await this.userRepository.update(user.id, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    });
  }

  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new ValidationError('2FA is not enabled');
    }

    // Generate new backup codes
    const backupCodes = this.twoFactorService.generateBackupCodes();

    // Save new codes
    await this.userRepository.update(user.id, {
      twoFactorBackupCodes: backupCodes,
    });

    return backupCodes;
  }

  async requestPasswordReset(email: string): Promise<PasswordResetToken> {
    if (!isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    const user = await this.userRepository.findByEmail(email.toLowerCase().trim());
    if (!user) {
      // Don't reveal if email exists or not for security
      throw new NotFoundError('If the email exists, a password reset link has been sent');
    }

    // Delete any existing reset tokens for this user
    await this.passwordResetTokenRepository.deleteByUserId(user.id);

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    const resetToken = await this.passwordResetTokenRepository.create({
      token,
      userId: user.id,
      expiresAt,
      used: false,
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      // Log error but don't fail the request (token is still created)
      console.error('Failed to send password reset email:', error);
    }

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const passwordValidation = isValidPassword(newPassword);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.error!);
    }

    const resetToken = await this.passwordResetTokenRepository.findByToken(token);
    if (!resetToken) {
      throw new ValidationError('Invalid or expired reset token');
    }

    if (resetToken.used) {
      throw new ValidationError('Reset token has already been used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new ValidationError('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);
    await this.userRepository.update(resetToken.userId, { password: hashedPassword });

    // Mark token as used
    await this.passwordResetTokenRepository.markAsUsed(resetToken.id);
  }
}

