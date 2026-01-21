import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { User } from '../model/User';
import { PasswordResetToken } from '../model/PasswordResetToken';
import { ActivityLog } from '../model/ActivityLog';
import { EmailVerificationToken } from '../model/EmailVerificationToken';
import { EmailLog } from '../model/EmailLog';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'authify',
  entities: [User, PasswordResetToken, ActivityLog, EmailVerificationToken, EmailLog],
  migrations: [path.join(__dirname, '../migrations/*.{ts,js}')],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: process.env.NODE_ENV === 'production',
});

export async function initializeDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
}


