import { Request, Response, NextFunction } from 'express';
import { authMiddleware, requireRole, AuthRequest } from '../authMiddleware';
import jwt from 'jsonwebtoken';

// Set up environment variables
process.env.JWT_SECRET = 'test-secret-key-for-auth-middleware';

describe('authMiddleware', () => {
  let mockRequest: Partial<AuthRequest>;
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
      headers: {},
      ip: '127.0.0.1',
    };
  });

  it('returns 401 when authorization header is missing', () => {
    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header does not start with Bearer', () => {
    mockRequest.headers = { authorization: 'Invalid token' };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', () => {
    mockRequest.headers = { authorization: 'Bearer invalid-token' };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('returns 401 when token is expired', () => {
    const expiredToken = jwt.sign(
      { id: 'user-1', email: 'test@example.com', role: 'USER' },
      'test-secret-key-for-auth-middleware',
      { expiresIn: '-1h' }
    );
    mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('returns 401 when token payload is missing required fields', () => {
    const invalidToken = jwt.sign({ id: 'user-1' }, 'test-secret-key-for-auth-middleware');
    mockRequest.headers = { authorization: `Bearer ${invalidToken}` };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('calls next() and sets user when token is valid', () => {
    const token = jwt.sign(
      { id: 'user-1', email: 'test@example.com', role: 'USER' },
      'test-secret-key-for-auth-middleware'
    );
    mockRequest.headers = { authorization: `Bearer ${token}` };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalled();
    expect(mockRequest.user).toEqual({
      id: 'user-1',
      email: 'test@example.com',
      role: 'USER',
    });
  });
});

describe('requireRole', () => {
  let mockRequest: Partial<AuthRequest>;
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
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER',
      },
    };
  });

  it('returns 401 when user is not authenticated', () => {
    mockRequest.user = undefined;
    const middleware = requireRole('ADMIN');

    middleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is not allowed (single role)', () => {
    const middleware = requireRole('ADMIN');

    middleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is not in allowed roles array', () => {
    const middleware = requireRole(['ADMIN', 'MODERATOR']);

    middleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('calls next() when user role matches single allowed role', () => {
    mockRequest.user = { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };
    const middleware = requireRole('ADMIN');

    middleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('calls next() when user role is in allowed roles array', () => {
    mockRequest.user = { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };
    const middleware = requireRole(['ADMIN', 'MODERATOR']);

    middleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('calls next() when user role matches second role in array', () => {
    mockRequest.user = { id: 'mod-1', email: 'mod@example.com', role: 'MODERATOR' };
    const middleware = requireRole(['ADMIN', 'MODERATOR']);

    middleware(mockRequest as AuthRequest, mockResponse as Response, nextMock);

    expect(nextMock).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });
});

