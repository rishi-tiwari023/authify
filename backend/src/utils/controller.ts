import { Response } from 'express';
import { AppError } from './errors';

/**
 * Standardize controller error handling across endpoints.
 */
export function handleControllerError(
  res: Response,
  error: unknown,
  fallbackStatus: number = 500,
  fallbackMessage: string = 'Internal server error'
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  // Log unexpected errors for diagnostics
  // eslint-disable-next-line no-console
  console.error('Unexpected controller error:', error);
  res.status(fallbackStatus).json({ error: fallbackMessage });
}


