import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { EmailVerificationToken } from '../model/EmailVerificationToken';

export class EmailVerificationTokenRepository {
  private repository: Repository<EmailVerificationToken>;

  constructor() {
    this.repository = AppDataSource.getRepository(EmailVerificationToken);
  }

  async create(data: Partial<EmailVerificationToken>): Promise<EmailVerificationToken> {
    const token = this.repository.create(data);
    return this.repository.save(token);
  }

  async findByToken(token: string): Promise<EmailVerificationToken | null> {
    return this.repository.findOne({ where: { token } });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  async markAsUsed(id: string): Promise<void> {
    await this.repository.update(id, { used: true });
  }
}

