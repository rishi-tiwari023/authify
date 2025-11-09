import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { PasswordResetToken } from '../model/PasswordResetToken';

export class PasswordResetTokenRepository {
  private repository: Repository<PasswordResetToken>;

  constructor() {
    this.repository = AppDataSource.getRepository(PasswordResetToken);
  }

  async create(tokenData: Partial<PasswordResetToken>): Promise<PasswordResetToken> {
    const token = this.repository.create(tokenData);
    return await this.repository.save(token);
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    return await this.repository.findOne({
      where: { token },
      relations: ['user'],
    });
  }

  async markAsUsed(tokenId: string): Promise<void> {
    await this.repository.update(tokenId, { used: true });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }
}

