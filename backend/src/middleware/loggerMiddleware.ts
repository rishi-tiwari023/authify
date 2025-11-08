import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 * Logs HTTP method, path, timestamp, and response status
 */
export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });
  
  next();
}

