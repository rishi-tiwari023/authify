import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { apiService } from '../services/api'
import { getErrorMessage } from '../utils/errorMessages'
import PasswordStrengthIndicator from './PasswordStrengthIndicator'
import './Login.css'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
    } else {
      setError('Invalid or missing reset token. Please request a new password reset link.')
    }
  }, [searchParams])

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number'
    }
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError('Reset token is required.')
      return
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.')
      return
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await apiService.resetPassword(token, newPassword)
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Password reset successful</h2>
          <p className="auth-subtitle">
            Your password has been reset successfully. Redirecting to login...
          </p>
          <p className="auth-footer">
            <Link to="/login">Go to login</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset your password</h2>
        <p className="auth-subtitle">Enter your new password below.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter your new password"
              disabled={loading || !token}
              required
              minLength={8}
            />
            <PasswordStrengthIndicator password={newPassword} />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setConfirmPasswordTouched(true)}
              placeholder="Confirm your new password"
              disabled={loading || !token}
              required
              minLength={8}
            />
            {confirmPasswordTouched && confirmPassword && (
              <div style={{ marginTop: '0.25rem' }}>
                {newPassword === confirmPassword ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ color: '#22c55e', fontSize: '0.75rem' }}>✓</span>
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Passwords match</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>⚠</span>
                    <span style={{ color: '#f87171', fontSize: '0.75rem' }}>Passwords do not match</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="submit" className="auth-button" disabled={loading || !token}>
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="auth-footer">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

