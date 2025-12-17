/**
 * Input sanitization utilities for XSS protection
 */

/**
 * Sanitize a string by removing potentially dangerous HTML/script tags
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
}

/**
 * Sanitize an object by recursively sanitizing all string values
 * @param obj - The object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (sanitized.hasOwnProperty(key)) {
      const value = sanitized[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value) as any;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item: unknown) =>
          typeof item === 'string'
            ? sanitizeString(item)
            : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, any>)
            : item
        ) as any;
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize email input (basic sanitization, validation should be done separately)
 * @param email - Email string to sanitize
 * @returns Sanitized email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  return email
    .toLowerCase()
    .trim()
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/\s+/g, ''); // Remove whitespace
}

/**
 * Sanitize URL input
 * @param url - URL string to sanitize
 * @returns Sanitized URL
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  return url
    .trim()
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol (can be used for XSS)
    .replace(/vbscript:/gi, ''); // Remove vbscript: protocol
}

