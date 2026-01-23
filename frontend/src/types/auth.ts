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
}
