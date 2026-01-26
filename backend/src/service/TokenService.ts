import jwt from 'jsonwebtoken';
import type { SignOptions, Secret } from 'jsonwebtoken';
import { TokenPayload } from '../types/auth';

/**
 * Service for handling JWT operations including signing and verification.
 */
export class TokenService {
    private readonly jwtSecret: Secret;
    private readonly jwtExpiresIn: SignOptions['expiresIn'];
    private readonly jwtExpiresInRememberMe: SignOptions['expiresIn'];
    private readonly refreshSecret: Secret;
    private readonly refreshExpiresIn: SignOptions['expiresIn'];
    private readonly refreshExpiresInRememberMe: SignOptions['expiresIn'];

    constructor() {
        const accessSecret = process.env.JWT_SECRET;
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

        if (!accessSecret || !refreshSecret) {
            throw new Error('JWT secrets are not properly configured in environment variables');
        }

        this.jwtSecret = accessSecret;
        this.refreshSecret = refreshSecret;
        this.jwtExpiresIn = (process.env.JWT_EXPIRATION || '15m') as SignOptions['expiresIn'];
        this.jwtExpiresInRememberMe = (process.env.JWT_EXPIRATION_REMEMBER_ME || '7d') as SignOptions['expiresIn'];
        this.refreshExpiresIn = (process.env.REFRESH_TOKEN_EXPIRATION || '7d') as SignOptions['expiresIn'];
        this.refreshExpiresInRememberMe = (process.env.REFRESH_TOKEN_EXPIRATION_REMEMBER_ME || '30d') as SignOptions['expiresIn'];
    }

    /**
     * Generates a short-lived access token.
     * @param payload User data to include in the token
     * @param rememberMe If true, extends token expiration for persistent sessions
     * @returns JWT access token string
     */
    signAccessToken(payload: TokenPayload, rememberMe = false): string {
        const expiresIn = rememberMe ? this.jwtExpiresInRememberMe : this.jwtExpiresIn;
        const signOptions: SignOptions = { expiresIn };
        return jwt.sign(payload, this.jwtSecret, signOptions);
    }

    /**
     * Generates a long-lived refresh token.
     * @param payload User data to include in the token
     * @param rememberMe If true, extends token expiration for persistent sessions
     * @returns JWT refresh token string
     */
    signRefreshToken(payload: TokenPayload, rememberMe = false): string {
        const expiresIn = rememberMe ? this.refreshExpiresInRememberMe : this.refreshExpiresIn;
        const signOptions: SignOptions = { expiresIn };
        return jwt.sign(payload, this.refreshSecret, signOptions);
    }

    /**
     * Verifies an access token.
     * @param token JWT access token
     * @returns Decoded payload
     */
    verifyAccessToken(token: string): TokenPayload {
        return jwt.verify(token, this.jwtSecret) as TokenPayload;
    }

    /**
     * Verifies a refresh token.
     * @param token JWT refresh token
     * @returns Decoded payload
     */
    verifyRefreshToken(token: string): TokenPayload {
        return jwt.verify(token, this.refreshSecret) as TokenPayload;
    }
}
