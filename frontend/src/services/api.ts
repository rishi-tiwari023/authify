import type { User, LoginResponse, LoginData, SignupData, PaginatedResponse } from '../types/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/**
 * Service for interacting with the backend API.
 * Handles authentication, token refresh, and session management.
 */
class ApiService {
  private isRefreshing = false
  private refreshPromise: Promise<LoginResponse> | null = null
  private readonly ACCESS_TOKEN_KEY = 'auth_token'
  private readonly REFRESH_TOKEN_KEY = 'refresh_token'
  private readonly USER_KEY = 'user'

  /**
   * Determine if the current auth token is near expiry and should be refreshed.
   * @param thresholdMinutes Time threshold in minutes
   * @returns True if token is expiring soon
   */
  needsTokenRefresh(thresholdMinutes = 5): boolean {
    const token = this.getAuthToken()
    return this.isTokenExpiringSoon(token, thresholdMinutes)
  }

  /**
   * Refresh the token if it is expiring soon. Swallows errors so callers
   * can attempt best-effort refresh without breaking flows.
   * @param thresholdMinutes Time threshold in minutes
   */
  async ensureTokenFresh(thresholdMinutes = 5): Promise<void> {
    if (!this.needsTokenRefresh(thresholdMinutes)) return
    try {
      await this.refreshToken()
    } catch {
      // Let caller handle auth state if needed
    }
  }

  /**
   * Internal helper to set session data in localStorage.
   * @private
   */
  private setSession(data: LoginResponse): void {
    if (data.token) {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, data.token)
      if (data.user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user))
      }
      if (data.refreshToken) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken)
      }
    }
  }

  /**
   * Internal helper to clear session data.
   * @private
   */
  private clearSession(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }

  /**
   * Retrieves the current access token.
   * @returns Token string or null
   */
  getAuthToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY)
  }

  /**
   * Retrieves the current refresh token.
   * @returns Token string or null
   * @private
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
  }

  /**
   * Decodes JWT payload.
   * @param token JWT string
   * @returns Decoded payload or null
   * @private
   */
  private decodeToken(token: string): { exp?: number } | null {
    try {
      const payload = token.split('.')[1]
      return JSON.parse(atob(payload))
    } catch {
      return null
    }
  }

  /**
   * Checks if token is near expiry.
   * @param token JWT string
   * @param thresholdMinutes Buffer in minutes
   * @returns True if expiring
   * @private
   */
  private isTokenExpiringSoon(token: string | null, thresholdMinutes = 5): boolean {
    if (!token) return true
    const decoded = this.decodeToken(token)
    if (!decoded || !decoded.exp) return true
    const expiryTime = decoded.exp * 1000
    const now = Date.now()
    const threshold = thresholdMinutes * 60 * 1000
    return expiryTime - now < threshold
  }

  /**
   * Generic request wrapper with retry and refresh logic.
   * @private
   */
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
        const delay = 500 * Math.pow(2, 3 - retries)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.request<T>(endpoint, options, retryOn401, retries - 1)
      }

      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.')
      }
      throw new Error('Failed to connect to server. Please try again later.')
    }

    // Handle 401 errors with automatic token refresh
    if (response.status === 401 && retryOn401 && token && !endpoint.includes('/auth/refresh')) {
      try {
        await this.refreshToken()
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
      } catch {
        this.logout()
        throw new Error('Session expired. Please log in again.')
      }
    }

    if (response.status >= 500 && retries > 0 && options.method === 'GET') {
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

  /**
   * Signs up a new user.
   * @param data Registration details
   */
  async signup(data: SignupData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    this.setSession(response)
    return response
  }

  /**
   * Logs in a user.
   * @param data Login credentials
   */
  async login(data: LoginData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    this.setSession(response)
    return response
  }

  /**
   * Logs out the current user.
   */
  async logout(): Promise<void> {
    this.clearSession()
  }

  /**
   * Retrieves current user data from the API.
   */
  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me')
  }

  /**
   * Refresh current user data and update localStorage.
   */
  async refreshUser(): Promise<User> {
    const current = await this.getCurrentUser()
    localStorage.setItem(this.USER_KEY, JSON.stringify(current))
    return current
  }

  /**
   * Attempts to refresh the access token using the refresh token.
   */
  async refreshToken(): Promise<LoginResponse> {
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
        this.setSession(data)
        return data
      } finally {
        this.isRefreshing = false
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  /**
   * Retrieves user from local storage.
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  }

  /**
   * Checks if a user is currently authenticated.
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken()
  }

  /**
   * Requests a password reset.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  /**
   * Resets password with token.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
  }

  /**
   * Verifies email with token.
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  /**
   * Gets user profile.
   */
  async getProfile(): Promise<User> {
    return this.request<User>('/user/profile')
  }

  /**
   * Updates user profile.
   */
  async updateProfile(data: { name?: string; email?: string; profileUrl?: string | null }): Promise<User> {
    const response = await this.request<User>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    if (response) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(response))
    }

    return response
  }

  /**
   * Changes user password.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/user/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }

  /**
   * Deletes user account.
   */
  async deleteAccount(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/user/account', {
      method: 'DELETE',
    })
  }

  /**
   * Lists users (Admin only).
   */
  async listUsers(): Promise<PaginatedResponse<User>> {
    return this.request<PaginatedResponse<User>>('/auth/users')
  }

  /**
   * Bans/unbans a user (Admin only).
   */
  async banUser(userId: string, isBanned: boolean): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>(`/admin/users/${userId}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ isBanned }),
    })
  }

  /**
   * Initiates 2FA setup.
   */
  async setup2FA(): Promise<{ secret: string; dataUrl: string }> {
    return this.request<{ secret: string; dataUrl: string }>('/auth/2fa/setup', {
      method: 'POST',
    })
  }

  /**
   * Enables 2FA with token.
   */
  async enable2FA(token: string): Promise<string[]> {
    return this.request<string[]>('/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  /**
   * Verifies 2FA token during login.
   */
  async verify2FA(userId: string, token: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ userId, token }),
    })

    this.setSession(response)
    return response
  }

  /**
   * Disables 2FA.
   */
  async disable2FA(password: string): Promise<void> {
    return this.request<void>('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  }

  /**
   * Regenerates backup codes.
   */
  async regenerateBackupCodes(): Promise<string[]> {
    return this.request<string[]>('/auth/2fa/backup-codes', {
      method: 'POST',
    })
  }
}

export const apiService = new ApiService()

