import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

type KeyGenerator = (req: Request) => string | undefined;

interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: KeyGenerator;
}

const store: RateLimitStore = {};

/**
 * Simple in-memory rate limiting middleware with configurable keying
 */
export function rateLimitMiddleware({
  maxRequests = 5,
  windowMs = 60000,
  keyGenerator,
}: RateLimitOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Prefer authenticated/user-aware key when provided, otherwise fall back to IP
    const key = (keyGenerator ? keyGenerator(req) : req.ip) || 'unknown';
    const now = Date.now();

    const record = store[key];

    if (!record || now > record.resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      next();
      return;
    }

    if (record.count >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again after ${Math.ceil((record.resetTime - now) / 1000)} seconds`,
      });
      return;
    }

    record.count++;
    next();
  };
}

