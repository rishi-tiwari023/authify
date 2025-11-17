import { Request, Response, NextFunction } from 'express';
import { sanitizeObject, sanitizeString, sanitizeUrl, sanitizeEmail } from '../utils/sanitization';

function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }
  return sanitizeObject(body);
}

function sanitizeRequestQuery(query: any): any {
  if (!query || typeof query !== 'object') {
    return query;
  }

  const sanitizedQuery: Record<string, any> = {};
  for (const key of Object.keys(query)) {
    const value = query[key];
    if (typeof value === 'string') {
      sanitizedQuery[key] = sanitizeString(value);
    } else {
      sanitizedQuery[key] = value;
    }
  }
  return sanitizedQuery;
}

function sanitizeRequestParams(params: any): any {
  if (!params || typeof params !== 'object') {
    return params;
  }

  const sanitizedParams: Record<string, any> = {};
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (typeof value === 'string') {
      sanitizedParams[key] = sanitizeString(value);
    } else {
      sanitizedParams[key] = value;
    }
  }
  return sanitizedParams;
}

/**
 * Express middleware to sanitize incoming request data to reduce XSS risk.
 */
export function sanitizationMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = sanitizeRequestBody(req.body);
  }

  if (req.query) {
    req.query = sanitizeRequestQuery(req.query);
  }

  if (req.params) {
    req.params = sanitizeRequestParams(req.params);
  }

  // Common special cases
  if (typeof req.body?.email === 'string') {
    req.body.email = sanitizeEmail(req.body.email);
  }

  if (typeof req.body?.profileUrl === 'string') {
    req.body.profileUrl = sanitizeUrl(req.body.profileUrl);
  }

  next();
}


