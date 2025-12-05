import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

export default function Dashboard() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="auth-container">
      <nav
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        }}
      >
        <Link
          to="/dashboard"
          style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#e2e8f0',
            textDecoration: 'none',
          }}
        >
          Authify
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isAuthenticated && user && (
            <>
              <span style={{ color: '#cbd5f5', fontSize: '0.9rem' }}>
                {user.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: '#cbd5f5',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.borderColor = '#6366f1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </nav>
      <div className="auth-card" style={{ marginTop: '5rem' }}>
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
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#a5b4fc',
                    textDecoration: 'none',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'
                    e.currentTarget.style.borderColor = '#6366f1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'
                  }}
                >
                  Admin Dashboard
                </Link>
              )}
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


