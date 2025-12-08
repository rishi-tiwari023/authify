import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Loading from './Loading'

export default function AdminRoute() {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loading message="Checking your session…" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

