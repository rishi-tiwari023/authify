import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../utils/errorMessages'
import EmailValidationFeedback from './EmailValidationFeedback'
import TwoFactorVerify from './TwoFactorVerify'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [userIdFor2FA, setUserIdFor2FA] = useState<string>('')
  const [rememberMeFor2FA, setRememberMeFor2FA] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please fill in both fields.')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const result = await login(email, password, rememberMe)
      if (result.requires2FA && result.userId) {
        setUserIdFor2FA(result.userId)
        setRememberMeFor2FA(result.rememberMe || rememberMe)
        setShow2FA(true)
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (show2FA) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <TwoFactorVerify
            userId={userIdFor2FA}
            rememberMe={rememberMeFor2FA}
            onSuccess={() => navigate('/dashboard')}
            onCancel={() => setShow2FA(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p className="auth-subtitle">Sign in to your Authify dashboard</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="you@example.com"
              disabled={loading}
              required
            />
            <EmailValidationFeedback email={email} touched={emailTouched} />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="rememberMe" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={loading}
                style={{ marginRight: '0.5rem', cursor: 'pointer' }}
              />
              Remember me for 30 days
            </label>
          </div>

          <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
            <Link to="/forgot-password" style={{ color: '#a5b4fc', textDecoration: 'none', fontSize: '0.875rem' }}>
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <a href="/signup">Create one</a>
        </p>
      </div>
    </div>
  )
}

