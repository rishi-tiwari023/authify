/**
 * Email service for sending emails (password reset, notifications, etc.)
 * This is a placeholder implementation that logs emails to console.
 * In production, integrate with a real email service like SendGrid, AWS SES, or Nodemailer.
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

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@authify.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Authify';
  }

  /**
   * Send an email
   * @param options - Email options
   * @returns Promise that resolves when email is sent
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    // Placeholder implementation - logs to console
    // TODO: Integrate with a real email service provider
    console.log('='.repeat(50));
    console.log('EMAIL SENT (Placeholder - not actually sent)');
    console.log('From:', `${this.fromName} <${this.fromEmail}>`);
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('Text:', options.text || '(HTML only)');
    console.log('HTML:', options.html);
    console.log('='.repeat(50));

    // In production, uncomment and configure one of these:
    // await this.sendWithNodemailer(options);
    // await this.sendWithSendGrid(options);
    // await this.sendWithAWSSES(options);
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
    const defaultResetUrl = resetUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
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

  // Placeholder methods for future email service integration

  // private async sendWithNodemailer(options: EmailOptions): Promise<void> {
  //   // Implement with nodemailer
  // }

  // private async sendWithSendGrid(options: EmailOptions): Promise<void> {
  //   // Implement with SendGrid
  // }

  // private async sendWithAWSSES(options: EmailOptions): Promise<void> {
  //   // Implement with AWS SES
  // }
}

