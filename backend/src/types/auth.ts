import { UserRole } from '../model/User';

export interface TokenPayload {
    id: string;
    email: string;
    role: UserRole;
}

export interface AuthResponse {
    user: any; // Using any for now to avoid circular dependency or complex user mapping here, will be refined in controllers
    token: string;
    refreshToken: string;
}

export interface TwoFARequirement {
    requires2FA: true;
    userId: string;
}

export type LoginResult = AuthResponse | TwoFARequirement | null;
