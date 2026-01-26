export interface User {
    id: string
    name: string
    email: string
    role: 'USER' | 'ADMIN'
    profileUrl: string | null
    createdAt: string
    updatedAt: string
    twoFactorEnabled?: boolean
    isBanned?: boolean
}

export interface LoginResponse {
    user: User
    token: string
    refreshToken?: string
    requires2FA?: boolean
    userId?: string
    rememberMe?: boolean
}

export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    limit: number
    totalPages: number
}

export interface SignupData {
    name: string
    email: string
    password: string
}

export interface LoginData {
    email: string
    password: string
    rememberMe?: boolean
}

export interface UpdateProfilePayload {
    name?: string
    email?: string
    profileUrl?: string | null
}

export interface AuthContextType {
    user: User | null
    loading: boolean
    login: (email: string, password: string, rememberMe?: boolean) => Promise<{ requires2FA: boolean; userId?: string; rememberMe?: boolean }>
    verify2FA: (userId: string, token: string, rememberMe?: boolean) => Promise<void>
    signup: (name: string, email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    isAuthenticated: boolean
    refreshUser: () => Promise<void>
    updateProfile: (data: UpdateProfilePayload) => Promise<void>
}
