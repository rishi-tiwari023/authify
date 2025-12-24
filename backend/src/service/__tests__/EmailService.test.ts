import { EmailService } from '../EmailService';
import nodemailer from 'nodemailer';
import { emailLogRepository } from '../../repository/EmailLogRepository';
import { EmailStatus } from '../../model/EmailLog';

// Mock dependencies
jest.mock('nodemailer');
jest.mock('../../repository/EmailLogRepository');

describe('EmailService', () => {
    let emailService: EmailService;
    let sendMailMock: jest.Mock;
    let saveLogMock: jest.Mock;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        process.env.EMAIL_FROM = 'test@example.com';
        process.env.EMAIL_FROM_NAME = 'Test App';
        process.env.SMTP_HOST = 'smtp.test.com';
        process.env.SMTP_USER = 'user';
        process.env.SMTP_PASS = 'pass';
        process.env.SMTP_PORT = '587';
        process.env.SMTP_SECURE = 'false';

        sendMailMock = jest.fn();
        (nodemailer.createTransport as jest.Mock).mockReturnValue({
            sendMail: sendMailMock,
        });

        saveLogMock = jest.fn();
        (emailLogRepository.save as jest.Mock) = saveLogMock;

        emailService = new EmailService();
    });

    describe('sendEmail', () => {
        it('should send email successfully and log as SENT', async () => {
            sendMailMock.mockResolvedValueOnce('OK');

            await emailService.sendEmail({
                to: 'recipient@example.com',
                subject: 'Test Subject',
                templateName: 'reset-password', // Using an existing template
                data: { resetUrl: 'http://test.com/reset' },
            });

            expect(sendMailMock).toHaveBeenCalledTimes(1);
            expect(saveLogMock).toHaveBeenCalledWith(expect.objectContaining({
                recipient: 'recipient@example.com',
                subject: 'Test Subject',
                status: EmailStatus.SENT,
                errorMessage: null,
            }));
        });

        it('should retry on failure and eventually succeed', async () => {
            sendMailMock.mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce('OK');

            await emailService.sendEmail({
                to: 'recipient@example.com',
                subject: 'Test Retry',
                templateName: 'welcome',
                data: { name: 'User' },
            });

            expect(sendMailMock).toHaveBeenCalledTimes(2);
            expect(saveLogMock).toHaveBeenCalledWith(expect.objectContaining({
                status: EmailStatus.SENT,
            }));
        });

        it('should fail after max retries and log as FAILED', async () => {
            sendMailMock.mockRejectedValue(new Error('Persistent error'));

            await emailService.sendEmail({
                to: 'recipient@example.com',
                subject: 'Test Fail',
                templateName: 'welcome',
                data: { name: 'User' },
            });

            expect(sendMailMock).toHaveBeenCalledTimes(3); // Max retries
            expect(saveLogMock).toHaveBeenCalledWith(expect.objectContaining({
                status: EmailStatus.FAILED,
                errorMessage: 'Persistent error',
            }));
        });

        it('should render template correctly', async () => {
            // This test implicitly tests template rendering via sendMailMock arguments checking
            // But we need to inspect the 'html' passed to sendMail
            sendMailMock.mockResolvedValue('OK');

            await emailService.sendEmail({
                to: 'test@example.com',
                subject: 'Template Test',
                templateName: 'welcome',
                data: { name: 'John Doe' }
            });

            const callArgs = sendMailMock.mock.calls[0][0];
            expect(callArgs.html).toContain('Welcome to Authify, John Doe!');
        });
    });
});
