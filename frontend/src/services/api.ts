const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  profileUrl: string | null
  createdAt: string
  updatedAt: string
  twoFactorEnabled?: boolean
}

export interface LoginResponse {
  user: User
  token: string
  refreshToken?: string
  requires2FA?: boolean
  userId?: string
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
  private readonly ACCESS_TOKEN_KEY = 'auth_token'
  private readonly REFRESH_TOKEN_KEY = 'refresh_token'

  /**
   * Determine if the current auth token is near expiry and should be refreshed.
   * Uses a 5 minute threshold by default to refresh proactively.
   */
  needsTokenRefresh(thresholdMinutes = 5): boolean {
    const token = this.getAuthToken()
    return this.isTokenExpiringSoon(token, thresholdMinutes)
  }

  /**
   * Refresh the token if it is expiring soon. Swallows errors so callers
   * can attempt best-effort refresh without breaking flows.
   */
  async ensureTokenFresh(thresholdMinutes = 5): Promise<void> {
    if (!this.needsTokenRefresh(thresholdMinutes)) return
    try {
      await this.refreshToken()
    } catch {
      // Let caller handle auth state if needed
    }
  }

  private getAuthToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY)
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
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
    retryOn401 = true,
    retries = 3
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

    let response: Response
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })
    } catch (fetchError) {
      if (retries > 0) {
        // Wait for a bit before retrying (exponential backoff: 500ms, 1000ms, 2000ms)
        const delay = 500 * Math.pow(2, 3 - retries)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.request<T>(endpoint, options, retryOn401, retries - 1)
      }

      // Handle network errors (no connection, timeout, etc.)
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.')
      }
      throw new Error('Failed to connect to server. Please try again later.')
    }

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

    if (response.status >= 500 && retries > 0 && options.method === 'GET') {
      // Retry 5xx errors for GET requests safety
      const delay = 500 * Math.pow(2, 3 - retries)
      await new Promise(resolve => setTimeout(resolve, delay))
      return this.request<T>(endpoint, options, retryOn401, retries - 1)
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
      localStorage.setItem(this.ACCESS_TOKEN_KEY, response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      if (response.refreshToken) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken)
      }
    }

    return response
  }

  async login(data: LoginData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (response.token) {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      if (response.refreshToken) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken)
      }
    }

    return response
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    localStorage.removeItem('user')
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me')
  }

  /**
   * Fetch the latest user from the API and store it locally.
   */
  async refreshUser(): Promise<User> {
    const current = await this.getCurrentUser()
    localStorage.setItem('user', JSON.stringify(current))
    return current
  }

  async refreshToken(): Promise<LoginResponse> {
    // Prevent multiple simultaneous refresh requests
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    const existingRefresh = this.getRefreshToken()
    if (!existingRefresh) {
      this.logout()
      throw new Error('No refresh token available')
    }

    this.isRefreshing = true
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: existingRefresh }),
        })

        if (!response.ok) {
          throw new Error('Token refresh failed')
        }

        const data = await response.json() as LoginResponse

        if (data.token) {
          localStorage.setItem(this.ACCESS_TOKEN_KEY, data.token)
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user))
          }
          if (data.refreshToken) {
            localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken)
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

  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
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

  async deleteAccount(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/user/account', {
      method: 'DELETE',
    })
  }

  async listUsers(): Promise<User[]> {
    return this.request<User[]>('/auth/users')
  }

  // 2FA Methods

  async setup2FA(): Promise<{ secret: string; dataUrl: string }> {
    return this.request<{ secret: string; dataUrl: string }>('/auth/2fa/setup', {
      method: 'POST',
    })
  }

  async enable2FA(token: string): Promise<string[]> {
    return this.request<string[]>('/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  async verify2FA(userId: string, token: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ userId, token }),
    })

    if (response.token) {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      if (response.refreshToken) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken)
      }
    }

    return response
  }

  async disable2FA(password: string): Promise<void> {
    return this.request<void>('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  }

  async regenerateBackupCodes(): Promise<string[]> {
    return this.request<string[]>('/auth/2fa/backup-codes', {
      method: 'POST',
    })
  }
}

export const apiService = new ApiService()

