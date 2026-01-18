import { Request, Response, NextFunction } from 'express';
import { validateBody } from '../validationMiddleware';
import { z } from 'zod';

describe('validateBody', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextMock: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockRequest = {
      body: {},
    };
  });

  it('calls next() when validation passes', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });
    mockRequest.body = { email: 'test@example.com', password: 'password123' };
    const middleware = validateBody(schema);

    middleware(mockRequest as Request, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
    expect(mockRequest.body).toEqual({ email: 'test@example.com', password: 'password123' });
  });

  it('returns 400 when validation fails', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });
    mockRequest.body = { email: 'invalid-email', password: 'short' };
    const middleware = validateBody(schema);

    middleware(mockRequest as Request, mockResponse as Response, nextMock);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: expect.any(String),
          message: expect.any(String),
        }),
      ]),
    });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('returns validation errors for multiple fields', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2),
    });
    mockRequest.body = { email: 'invalid', password: 'short', name: 'A' };
    const middleware = validateBody(schema);

    middleware(mockRequest as Request, mockResponse as Response, nextMock);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({ path: expect.any(String), message: expect.any(String) }),
      ]),
    });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('transforms and validates data according to schema', () => {
    const schema = z.object({
      email: z.string().trim().email().toLowerCase(),
      age: z.number().int().positive(),
    });
    mockRequest.body = { email: '  TEST@EXAMPLE.COM  ', age: 25 };
    const middleware = validateBody(schema);

    middleware(mockRequest as Request, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalled();
    expect(mockRequest.body).toEqual({ email: 'test@example.com', age: 25 });
  });

  it('handles nested object validation', () => {
    const schema = z.object({
      user: z.object({
        name: z.string().min(2),
        email: z.string().email(),
      }),
    });
    mockRequest.body = { user: { name: 'John Doe', email: 'john@example.com' } };
    const middleware = validateBody(schema);

    middleware(mockRequest as Request, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalled();
    expect(mockRequest.body).toEqual({ user: { name: 'John Doe', email: 'john@example.com' } });
  });

  it('handles optional fields', () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().optional(),
    });
    mockRequest.body = { email: 'test@example.com' };
    const middleware = validateBody(schema);

    middleware(mockRequest as Request, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalled();
    expect(mockRequest.body).toEqual({ email: 'test@example.com' });
  });
});

