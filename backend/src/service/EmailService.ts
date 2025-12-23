import nodemailer, { Transporter } from 'nodemailer';

/**
 * Email service for sending emails (password reset, notifications, etc.)
 */
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private transporter: Transporter | null = null;
  private readonly emailEnabled: boolean;

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
      console.warn('[EmailService] SMTP credentials not configured. Emails will be logged to console.');
    }
  }

  /**
   * Send an email
   * @param options - Email options
   * @returns Promise that resolves when email is sent
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (this.transporter) {
      await this.transporter.sendMail({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return;
    }

    // Fallback logging when transporter not configured
    console.log('='.repeat(50));
    console.log('[EmailService] SMTP not configured. Logging email instead:');
    console.log('From:', `${this.fromName} <${this.fromEmail}>`);
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('Text:', options.text || '(HTML only)');
    console.log('HTML:', options.html);
    console.log('='.repeat(50));
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

    const subject = 'Password Reset Request';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .button:hover { background-color: #0056b3; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Password Reset Request</h1>
            <p>You have requested to reset your password. Click the button below to reset your password:</p>
            <a href="${defaultResetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${defaultResetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this password reset, please ignore this email.</p>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Password Reset Request

You have requested to reset your password. Visit the following link to reset your password:

${defaultResetUrl}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send welcome email after signup
   * @param email - Recipient email
   * @param name - User's name
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const subject = 'Welcome to Authify!';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Welcome to Authify, ${name}!</h1>
            <p>Thank you for signing up. Your account has been successfully created.</p>
            <p>You can now log in and start using our services.</p>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
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

    const subject = 'Verify Your Email Address';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .button:hover { background-color: #0056b3; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Verify Your Email Address</h1>
            <p>Hello ${name},</p>
            <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not create an account, please ignore this email.</p>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Verify Your Email Address

Hello ${name},

Thank you for signing up! Please verify your email address by visiting the following link:

${verificationUrl}

This link will expire in 24 hours.

If you did not create an account, please ignore this email.
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Check if email sending is fully configured.
   */
  isEmailEnabled(): boolean {
    return this.emailEnabled;
  }
}

