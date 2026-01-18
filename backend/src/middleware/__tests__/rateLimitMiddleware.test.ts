import { Request, Response, NextFunction } from 'express';
import { rateLimitMiddleware, resetRateLimitStore } from '../rateLimitMiddleware';

describe('rateLimitMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextMock: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimitStore();
    jest.useFakeTimers();

    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockRequest = {
      ip: '127.0.0.1',
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows requests within rate limit', () => {
    const middleware = rateLimitMiddleware({ maxRequests: 5, windowMs: 60000 });

    for (let i = 0; i < 5; i++) {
      middleware(mockRequest as Request, mockResponse as Response, nextMock);
    }

    expect(nextMock).toHaveBeenCalledTimes(5);
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('blocks requests exceeding rate limit', () => {
    const middleware = rateLimitMiddleware({ maxRequests: 3, windowMs: 60000 });

    // Make 3 requests (within limit)
    for (let i = 0; i < 3; i++) {
      middleware(mockRequest as Request, mockResponse as Response, nextMock);
    }

    // 4th request should be blocked
    middleware(mockRequest as Request, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalledTimes(3);
    expect(statusMock).toHaveBeenCalledWith(429);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Too many requests',
        message: expect.stringContaining('Rate limit exceeded'),
      })
    );
  });

  it('resets rate limit after window expires', () => {
    const middleware = rateLimitMiddleware({ maxRequests: 2, windowMs: 60000 });

    // Make 2 requests (at limit)
    middleware(mockRequest as Request, mockResponse as Response, nextMock);
    middleware(mockRequest as Request, mockResponse as Response, nextMock);

    // Advance time past window
    jest.advanceTimersByTime(61000);

    // Should allow request again
    middleware(mockRequest as Request, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalledTimes(3);
  });

  it('uses custom key generator when provided', () => {
    const customKeyGenerator = jest.fn().mockReturnValue('custom-key');
    const middleware = rateLimitMiddleware({
      maxRequests: 2,
      windowMs: 60000,
      keyGenerator: customKeyGenerator,
    });

    middleware(mockRequest as Request, mockResponse as Response, nextMock);

    expect(customKeyGenerator).toHaveBeenCalledWith(mockRequest);
  });

  it('falls back to IP when key generator returns undefined', () => {
    const customKeyGenerator = jest.fn().mockReturnValue(undefined);
    const middleware = rateLimitMiddleware({
      maxRequests: 2,
      windowMs: 60000,
      keyGenerator: customKeyGenerator,
    });

    middleware(mockRequest as Request, mockResponse as Response, nextMock);

    expect(customKeyGenerator).toHaveBeenCalled();
    expect(nextMock).toHaveBeenCalled();
  });

  it('uses default maxRequests and windowMs when not provided', () => {
    const middleware = rateLimitMiddleware();

    // Should allow at least 5 requests (default maxRequests)
    for (let i = 0; i < 5; i++) {
      middleware(mockRequest as Request, mockResponse as Response, nextMock);
    }

    expect(nextMock).toHaveBeenCalledTimes(5);
  });

  it('tracks rate limits separately for different IPs', () => {
    const middleware = rateLimitMiddleware({ maxRequests: 2, windowMs: 60000 });

    const request1 = { ...mockRequest, ip: '127.0.0.1' } as Request;
    const request2 = { ...mockRequest, ip: '192.168.1.1' } as Request;

    // Both IPs should be able to make 2 requests
    middleware(request1, mockResponse as Response, nextMock);
    middleware(request1, mockResponse as Response, nextMock);
    middleware(request2, mockResponse as Response, nextMock);
    middleware(request2, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalledTimes(4);
  });

  it('handles unknown IP gracefully', () => {
    const middleware = rateLimitMiddleware({ maxRequests: 2, windowMs: 60000 });
    const requestWithoutIp = { ...mockRequest, ip: undefined } as Request;

    middleware(requestWithoutIp, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalled();
  });
});

