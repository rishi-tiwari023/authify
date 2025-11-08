import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Simple in-memory rate limiting middleware
 * @param maxRequests Maximum number of requests allowed
 * @param windowMs Time window in milliseconds
 */
export function rateLimitMiddleware(maxRequests: number = 5, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
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

