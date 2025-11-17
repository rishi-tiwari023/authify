import { UserRepository } from '../repository/UserRepository';
import { User, UserRole } from '../model/User';
import * as bcrypt from 'bcrypt';
import { ValidationError, NotFoundError } from '../utils/errors';
import { isValidEmail, isValidPassword, validateName } from '../utils/validation';
import { PasswordResetTokenRepository } from '../repository/PasswordResetTokenRepository';
import { PasswordResetToken } from '../model/PasswordResetToken';
import { EmailService } from './EmailService';
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
  private emailService: EmailService;
  private readonly saltRounds = 10;

  constructor() {
    this.userRepository = new UserRepository();
    this.passwordResetTokenRepository = new PasswordResetTokenRepository();
    this.emailService = new EmailService();
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

    return user;
  }

  async login(data: LoginData): Promise<User | null> {
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

    return user;
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

