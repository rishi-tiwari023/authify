import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { ActivityLog } from '../model/ActivityLog';

export class ActivityLogRepository {
  private repository: Repository<ActivityLog>;

  constructor() {
    this.repository = AppDataSource.getRepository(ActivityLog);
  }

  async createLog(data: Partial<ActivityLog>): Promise<ActivityLog> {
    const log = this.repository.create(data);
    return this.repository.save(log);
  }
}

