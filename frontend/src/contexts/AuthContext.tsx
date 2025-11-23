import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { apiService } from '../services/api'
import type { User } from '../services/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = apiService.getStoredUser()
    if (storedUser && apiService.isAuthenticated()) {
      setUser(storedUser)
      // Verify token is still valid
      apiService.getCurrentUser()
        .then((currentUser) => {
          setUser(currentUser)
          localStorage.setItem('user', JSON.stringify(currentUser))
        })
        .catch(() => {
          // Token invalid, clear storage
          apiService.logout()
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
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

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
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

