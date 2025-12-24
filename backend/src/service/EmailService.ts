import nodemailer, { Transporter } from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import { EmailLog, EmailStatus } from '../model/EmailLog';
import { emailLogRepository } from '../repository/EmailLogRepository';

/**
 * Email service for sending emails (password reset, notifications, etc.)
 */
export interface EmailOptions {
  to: string;
  subject: string;
  templateName: string;
  data: Record<string, any>;
}

export class EmailService {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private transporter: Transporter | null = null;
  private readonly emailEnabled: boolean;
  private readonly maxRetries = 3;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@authify.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Authify';
    this.emailEnabled = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    if (this.emailEnabled) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT || 587) === 465,
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!,
        },
      });
    } else {
      console.warn('[EmailService] SMTP credentials not configured. Emails will be logged to console and database as FAILED (simulated).');
    }
  }

  /**
   * Render an EJS template
   * @param templateName - Name of the template file (without extension)
   * @param data - Data to inject into template
   */
  private async renderTemplate(templateName: string, data: Record<string, any>): Promise<string> {
    const templatePath = path.join(__dirname, '../templates', `${templateName}.ejs`);
    return await ejs.renderFile(templatePath, data);
  }

  /**
   * Send an email with retry logic and logging
   * @param options - Email options
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    const html = await this.renderTemplate(options.templateName, options.data);

    let attempt = 0;
    let sent = false;
    let lastError = '';

    if (this.transporter) {
      while (attempt < this.maxRetries && !sent) {
        attempt++;
        try {
          await this.transporter.sendMail({
            from: `${this.fromName} <${this.fromEmail}>`,
            to: options.to,
            subject: options.subject,
            html: html,
          });
          sent = true;
        } catch (error: any) {
          lastError = error.message || 'Unknown error';
          console.error(`[EmailService] Attempt ${attempt} failed:`, lastError);
          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      }
    } else {
      // Fallback logging when transporter not configured
      console.log('='.repeat(50));
      console.log('[EmailService] SMTP not configured. Logging email instead:');
      console.log('From:', `${this.fromName} <${this.fromEmail}>`);
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('Template:', options.templateName);
      console.log('Data:', JSON.stringify(options.data, null, 2));
      console.log('='.repeat(50));
      // We consider it "failed" for logging purposes if actual sending didn't happen, 
      // or "sent" if we consider console logging as success in dev. 
      // Let's mark as FAILED with message "SMTP not configured" for clarity in DB logs, 
      // or maybe SENT if we want to avoid error noise in dev.
      // Given the requirement "Add email delivery status tracking", let's log what actually happened.
      lastError = 'SMTP not configured';
    }

    // Log to database
    const emailLog = new EmailLog();
    emailLog.recipient = options.to;
    emailLog.subject = options.subject;
    emailLog.status = sent ? EmailStatus.SENT : EmailStatus.FAILED;
    emailLog.errorMessage = sent ? null : lastError;

    try {
      await emailLogRepository.save(emailLog);
    } catch (dbError) {
      console.error('[EmailService] Failed to save email log:', dbError);
    }
  }

  /**
   * Send password reset email
   * @param email - Recipient email
   * @param resetToken - Password reset token
   * @param resetUrl - Full URL for password reset (optional)
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    resetUrl?: string
  ): Promise<void> {
    const defaultResetUrl = resetUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      templateName: 'reset-password',
      data: { resetUrl: defaultResetUrl },
    });
  }

  /**
   * Send welcome email after signup
   * @param email - Recipient email
   * @param name - User's name
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Welcome to Authify!',
      templateName: 'welcome',
      data: { name },
    });
  }

  /**
   * Send email verification email
   * @param email - Recipient email
   * @param name - User's name
   * @param verificationToken - Email verification token
   */
  async sendVerificationEmail(email: string, name: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      templateName: 'verify-email',
      data: { name, verificationUrl },
    });
  }

  /**
   * Check if email sending is fully configured.
   */
  isEmailEnabled(): boolean {
    return this.emailEnabled;
  }
}

