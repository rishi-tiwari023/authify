import type { Request } from 'express';
import { ActivityLogService } from '../service/ActivityLogService';

export interface ActivityLogOptions {
  userId: string;
  action: string;
  req?: Request;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget activity logging with defensive error handling.
 */
export async function safeLogActivity(
  activityLogService: ActivityLogService,
  { userId, action, req, metadata }: ActivityLogOptions
): Promise<void> {
  try {
    await activityLogService.log({
      userId,
      action,
      metadata,
      ipAddress: req?.ip,
      userAgent: (req?.headers['user-agent'] as string | undefined) || undefined,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to log activity', error);
  }
}


