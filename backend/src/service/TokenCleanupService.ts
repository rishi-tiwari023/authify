import { PasswordResetTokenRepository } from '../repository/PasswordResetTokenRepository';

/**
 * Service for cleaning up expired password reset tokens
 */
export class TokenCleanupService {
  private passwordResetTokenRepository: PasswordResetTokenRepository;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.passwordResetTokenRepository = new PasswordResetTokenRepository();
  }

  /**
   * Start the cleanup service to periodically remove expired tokens
   */
  start(): void {
    if (this.cleanupInterval) {
      return; // Already started
    }

    // Run cleanup immediately on start
    this.cleanupExpiredTokens().catch((err) => {
      console.error('Error during initial token cleanup:', err);
    });

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens().catch((err) => {
        console.error('Error during periodic token cleanup:', err);
      });
    }, this.CLEANUP_INTERVAL_MS);

    console.log('Token cleanup service started');
  }

  /**
   * Stop the cleanup service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Token cleanup service stopped');
    }
  }

  /**
   * Manually trigger cleanup of expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      await this.passwordResetTokenRepository.deleteExpiredTokens();
      console.log('Expired password reset tokens cleaned up');
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error);
      throw error;
    }
  }
}

