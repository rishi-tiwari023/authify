import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * PublicRoute component
 * 
 * Redirects authenticated users to the dashboard.
 * Used for routes like /login and /signup which should only be accessible to guests.
 */
export default function PublicRoute() {
  const { isAuthenticated, loading } = useAuth()

  // Wait for auth to initialize to prevent flicker
  if (loading) {
    return <div className="loading-container">Loading...</div>
  }

  // If user is authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  // If not authenticated, render the children (Login/Signup/etc.)
  return <Outlet />
}
