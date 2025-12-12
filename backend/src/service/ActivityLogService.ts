import { ActivityLogRepository } from '../repository/ActivityLogRepository';

export class ActivityLogService {
  private repository: ActivityLogRepository;

  constructor() {
    this.repository = new ActivityLogRepository();
  }

  async log(params: {
    userId: string;
    action: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await this.repository.createLog({
      userId: params.userId,
      action: params.action,
      metadata: params.metadata,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  }
}

