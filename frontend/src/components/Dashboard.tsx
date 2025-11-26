import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth()

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Dashboard</h2>
        {isAuthenticated && user ? (
          <>
            <p className="auth-subtitle">Welcome back, {user.name}.</p>
            <p>Email: {user.email}</p>
            <p>Role: {user.role}</p>
          </>
        ) : (
          <p className="auth-subtitle">Please log in to view your dashboard.</p>
        )}
      </div>
    </div>
  )
}


