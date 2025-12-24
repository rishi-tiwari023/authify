import { AppDataSource } from '../config/data-source';
import { EmailLog } from '../model/EmailLog';

export const emailLogRepository = AppDataSource.getRepository(EmailLog);
