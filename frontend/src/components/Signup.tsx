import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../utils/errorMessages'
import PasswordStrengthIndicator from './PasswordStrengthIndicator'
import EmailValidationFeedback from './EmailValidationFeedback'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

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

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (!validateEmail(email)) {
      setError('Please provide a valid email address.')
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await signup(name.trim(), email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-container">
      <div className="auth-card">
        <h2>Create an account</h2>
        <p className="auth-subtitle">Sign up to start testing Authify flows.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <label className="form-group">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Rishi Tiwari"
              disabled={loading}
              required
            />
          </label>

          <label className="form-group">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="you@example.com"
              disabled={loading}
              required
            />
            <EmailValidationFeedback email={email} touched={emailTouched} />
          </label>

          <label className="form-group">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              disabled={loading}
              required
              minLength={8}
            />
            <PasswordStrengthIndicator password={password} />
          </label>

          <label className="form-group">
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setConfirmPasswordTouched(true)}
              placeholder="Repeat your password"
              disabled={loading}
              required
              minLength={8}
            />
            {confirmPasswordTouched && confirmPassword && (
              <div style={{ marginTop: '0.25rem' }}>
                {password === confirmPassword ? (
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
          </label>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
      </div>
    </section>
  )
}

