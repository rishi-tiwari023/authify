import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Dashboard</h2>
        {isAuthenticated && user ? (
          <>
            <p className="auth-subtitle">Welcome back, {user.name}.</p>
            <p>Email: {user.email}</p>
            <p>Role: {user.role}</p>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              <Link
                to="/profile"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: '#a5b4fc',
                  textDecoration: 'none',
                  textAlign: 'center',
                  fontSize: '0.9rem',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.borderColor = '#6366f1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'
                }}
              >
                View Profile
              </Link>
              <button type="button" className="auth-button" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </>
        ) : (
          <p className="auth-subtitle">Please log in to view your dashboard.</p>
        )}
      </div>
    </div>
  )
}


