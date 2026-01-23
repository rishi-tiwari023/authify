import jwt from 'jsonwebtoken';
import type { SignOptions, Secret } from 'jsonwebtoken';
import { TokenPayload } from '../types/auth';

/**
 * Service for handling JWT operations including signing and verification.
 */
export class TokenService {
    private readonly jwtSecret: Secret;
    private readonly jwtExpiresIn: SignOptions['expiresIn'];
    private readonly refreshSecret: Secret;
    private readonly refreshExpiresIn: SignOptions['expiresIn'];

    constructor() {
        const accessSecret = process.env.JWT_SECRET;
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

        if (!accessSecret || !refreshSecret) {
            throw new Error('JWT secrets are not properly configured in environment variables');
        }

        this.jwtSecret = accessSecret;
        this.refreshSecret = refreshSecret;
        this.jwtExpiresIn = (process.env.JWT_EXPIRATION || '15m') as SignOptions['expiresIn'];
        this.refreshExpiresIn = (process.env.REFRESH_TOKEN_EXPIRATION || '7d') as SignOptions['expiresIn'];
    }

    /**
     * Generates a short-lived access token.
     * @param payload User data to include in the token
     * @returns JWT access token string
     */
    signAccessToken(payload: TokenPayload): string {
        const signOptions: SignOptions = { expiresIn: this.jwtExpiresIn };
        return jwt.sign(payload, this.jwtSecret, signOptions);
    }

    /**
     * Generates a long-lived refresh token.
     * @param payload User data to include in the token
     * @returns JWT refresh token string
     */
    signRefreshToken(payload: TokenPayload): string {
        const signOptions: SignOptions = { expiresIn: this.refreshExpiresIn };
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
