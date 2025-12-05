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
            transition: 'color 200ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#a5b4fc'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#e2e8f0'
          }}
        >
          Authify
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isAuthenticated && user && (
            <>
              <Link
                to="/profile"
                style={{
                  padding: '0.5rem 1rem',
                  color: '#cbd5f5',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  borderRadius: '0.5rem',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.color = '#e2e8f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#cbd5f5'
                }}
              >
                Profile
              </Link>
              <Link
                to="/profile"
                style={{
                  padding: '0.5rem 1rem',
                  color: '#cbd5f5',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  borderRadius: '0.5rem',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.color = '#e2e8f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#cbd5f5'
                }}
              >
                Settings
              </Link>
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#a5b4fc',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    borderRadius: '0.5rem',
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'
                    e.currentTarget.style.borderColor = '#6366f1'
                    e.currentTarget.style.color = '#c7d2fe'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'
                    e.currentTarget.style.color = '#a5b4fc'
                  }}
                >
                  Admin
                </Link>
              )}
              <span style={{ color: '#cbd5f5', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
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
      <div className="auth-card" style={{ marginTop: '5rem', maxWidth: '600px' }}>
        <h2>Dashboard</h2>
        {isAuthenticated && user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
              {user.profileUrl ? (
                <img
                  src={user.profileUrl}
                  alt={user.name}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(99, 102, 241, 0.3)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'linear-gradient(120deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: '600',
                    color: '#fff',
                    border: '2px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="auth-subtitle" style={{ margin: 0 }}>
                  Welcome back, {user.name}!
                </p>
              </div>
            </div>
            <div
              style={{
                marginTop: '2rem',
                padding: '1.5rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '1rem',
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Email</span>
                  <p style={{ color: '#e2e8f0', margin: '0.25rem 0 0 0', fontSize: '1rem' }}>
                    {user.email}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Role</span>
                  <p style={{ color: '#e2e8f0', margin: '0.25rem 0 0 0', fontSize: '1rem' }}>
                    {user.role}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="auth-subtitle">Please log in to view your dashboard.</p>
        )}
      </div>
    </div>
  )
}


