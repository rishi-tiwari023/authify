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
  private isRefreshing = false
  private refreshPromise: Promise<LoginResponse> | null = null

  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  private decodeToken(token: string): { exp?: number } | null {
    try {
      const payload = token.split('.')[1]
      return JSON.parse(atob(payload))
    } catch {
      return null
    }
  }

  private isTokenExpiringSoon(token: string | null, thresholdMinutes = 5): boolean {
    if (!token) return true
    const decoded = this.decodeToken(token)
    if (!decoded || !decoded.exp) return true
    const expiryTime = decoded.exp * 1000
    const now = Date.now()
    const threshold = thresholdMinutes * 60 * 1000
    return expiryTime - now < threshold
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOn401 = true
  ): Promise<T> {
    let token = this.getAuthToken()
    
    // Check if token is expiring soon and refresh proactively
    if (token && this.isTokenExpiringSoon(token) && !this.isRefreshing) {
      try {
        await this.refreshToken()
        token = this.getAuthToken()
      } catch {
        // If refresh fails, continue with original token
      }
    }

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

    // Handle 401 errors with automatic token refresh
    if (response.status === 401 && retryOn401 && token && !endpoint.includes('/auth/refresh')) {
      try {
        await this.refreshToken()
        // Retry the original request with new token
        const newToken = this.getAuthToken()
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
          })
          if (!retryResponse.ok) {
            const error = await retryResponse.json().catch(() => ({ error: 'Request failed' }))
            throw new Error(error.error || `HTTP error! status: ${retryResponse.status}`)
          }
          return retryResponse.json()
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        this.logout()
        throw new Error('Session expired. Please log in again.')
      }
    }

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
    // Prevent multiple simultaneous refresh requests
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = (async () => {
      try {
        const token = this.getAuthToken()
        if (!token) {
          throw new Error('No token to refresh')
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }

        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers,
        })

        if (!response.ok) {
          throw new Error('Token refresh failed')
        }

        const data = await response.json() as LoginResponse
        
        if (data.token) {
          localStorage.setItem('auth_token', data.token)
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user))
          }
        }
        
        return data
      } finally {
        this.isRefreshing = false
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken()
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
  }

  async getProfile(): Promise<User> {
    return this.request<User>('/user/profile')
  }

  async updateProfile(data: { name?: string; email?: string; profileUrl?: string | null }): Promise<User> {
    const response = await this.request<User>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    
    // Update stored user data
    if (response) {
      localStorage.setItem('user', JSON.stringify(response))
    }
    
    return response
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/user/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }
}

export const apiService = new ApiService()

