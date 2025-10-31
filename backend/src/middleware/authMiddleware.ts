import { Request, Response, NextFunction } from 'express';

// Temporary middleware - will be replaced with JWT verification
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // TODO: Extract and verify JWT token from Authorization header
  const token = req.headers.authorization;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Placeholder: token validation will be implemented later
  next();
}

