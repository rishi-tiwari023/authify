import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navigation() {
  const { isAuthenticated } = useAuth()

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem clamp(1.5rem, 5vw, 4rem)',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Link
        to="/"
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
        {isAuthenticated ? (
          <Link
            to="/dashboard"
            style={{
              padding: '0.6rem 1.25rem',
              background: 'linear-gradient(120deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#a5b4fc',
              textDecoration: 'none',
              fontSize: '0.9rem',
              borderRadius: '0.5rem',
              transition: 'all 200ms ease',
              fontWeight: '500',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(120deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))'
              e.currentTarget.style.borderColor = '#6366f1'
              e.currentTarget.style.color = '#c7d2fe'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(120deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))'
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
              e.currentTarget.style.color = '#a5b4fc'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              style={{
                padding: '0.6rem 1.25rem',
                color: '#cbd5f5',
                textDecoration: 'none',
                fontSize: '0.9rem',
                borderRadius: '0.5rem',
                transition: 'all 200ms ease',
                border: '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.color = '#e2e8f0'
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#cbd5f5'
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Login
            </Link>
            <Link
              to="/signup"
              style={{
                padding: '0.6rem 1.25rem',
                background: 'linear-gradient(120deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#a5b4fc',
                textDecoration: 'none',
                fontSize: '0.9rem',
                borderRadius: '0.5rem',
                transition: 'all 200ms ease',
                fontWeight: '500',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(120deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))'
                e.currentTarget.style.borderColor = '#6366f1'
                e.currentTarget.style.color = '#c7d2fe'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(120deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))'
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
                e.currentTarget.style.color = '#a5b4fc'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
