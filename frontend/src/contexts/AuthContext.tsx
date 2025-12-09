import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { apiService } from '../services/api'
import type { User } from '../services/api'

interface UpdateProfilePayload {
  name?: string
  email?: string
  profileUrl?: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  refreshUser: () => Promise<void>
  updateProfile: (data: UpdateProfilePayload) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      const storedUser = apiService.getStoredUser()

      if (storedUser && apiService.isAuthenticated()) {
        setUser(storedUser)
        try {
          await apiService.ensureTokenFresh()
          const currentUser = await apiService.refreshUser()
          if (isMounted) {
            setUser(currentUser)
          }
        } catch {
          await apiService.logout()
          if (isMounted) {
            setUser(null)
          }
        } finally {
          if (isMounted) {
            setLoading(false)
          }
        }
      } else {
        setLoading(false)
      }
    }

    initialize()

    // Proactively refresh token on an interval to keep sessions alive
    const refreshInterval = setInterval(() => {
      apiService.ensureTokenFresh().catch(async () => {
        await apiService.logout()
        if (isMounted) {
          setUser(null)
        }
      })
    }, 4 * 60 * 1000) // every 4 minutes

    return () => {
      isMounted = false
      clearInterval(refreshInterval)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await apiService.login({ email, password })
    setUser(response.user)
  }

  const signup = async (name: string, email: string, password: string) => {
    const response = await apiService.signup({ name, email, password })
    setUser(response.user)
  }

  const logout = async () => {
    await apiService.logout()
    setUser(null)
  }

  const refreshUser = async () => {
    const updatedUser = await apiService.refreshUser()
    setUser(updatedUser)
  }

  const updateProfile = async (data: UpdateProfilePayload) => {
    const updated = await apiService.updateProfile(data)
    setUser(updated)
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    refreshUser,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

