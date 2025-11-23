const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  profileUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  user: User
  token: string
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

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async signup(data: SignupData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    if (response.token) {
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
    }
    
    return response
  }

  async login(data: LoginData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    if (response.token) {
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
    }
    
    return response
  }

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me')
  }

  async refreshToken(): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
    })
    
    if (response.token) {
      localStorage.setItem('auth_token', response.token)
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user))
      }
    }
    
    return response
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken()
  }
}

export const apiService = new ApiService()

