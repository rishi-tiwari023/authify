import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiService } from '../services/api'
import { getErrorMessage } from '../utils/errorMessages'
import PasswordStrengthIndicator from './PasswordStrengthIndicator'
import './Login.css'

interface ChangePasswordProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ChangePassword({ onSuccess, onCancel }: ChangePasswordProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character'
    }
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    // Validate new password
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)
    try {
      await apiService.changePassword(currentPassword, newPassword)
      setSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // Clear success message after 3 seconds and call onSuccess if provided
      setTimeout(() => {
        setSuccess(null)
        if (onSuccess) {
          onSuccess()
        }
      }, 3000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card" style={{ marginTop: '2rem' }}>
      <h2>Change Password</h2>
      <p className="auth-subtitle">Update your account password</p>

      <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#86efac',
              fontSize: '0.9rem',
            }}
            role="alert"
          >
            {success}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="currentPassword">Current Password</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Enter current password"
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Enter new password"
            disabled={loading}
            required
            minLength={8}
          />
          <PasswordStrengthIndicator password={newPassword} />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onBlur={() => setConfirmPasswordTouched(true)}
            placeholder="Confirm new password"
            disabled={loading}
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

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Changing…' : 'Change Password'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="auth-button"
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#a5b4fc',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

