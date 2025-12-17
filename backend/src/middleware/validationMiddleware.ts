import { Request, Response, NextFunction } from 'express';
import type { ZodError, ZodIssue, ZodTypeAny } from 'zod';

interface ValidationErrorResponse {
  error: string;
  details?: Array<{
    path: string;
    message: string;
  }>;
}

function formatZodError(error: ZodError): ValidationErrorResponse {
  return {
    error: 'Validation failed',
    details: error.issues.map((issue: ZodIssue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(formatZodError(result.error));
      return;
    }
    req.body = result.data;
    next();
  };
}


