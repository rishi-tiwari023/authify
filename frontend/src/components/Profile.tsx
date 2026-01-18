import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiService } from '../services/api'
import { getErrorMessage } from '../utils/errorMessages'
import ChangePassword from './ChangePassword'
import TwoFactorSettings from './TwoFactorSettings'
import Loading from './Loading'
import './Login.css'

export default function Profile() {
  const { user: authUser, logout } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await apiService.getProfile()
        setName(profile.name)
        setEmail(profile.email)
        setProfileUrl(profile.profileUrl || '')
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setFetching(false)
      }
    }

    fetchProfile()
  }, [])

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const validateUrl = (value: string) => {
    if (!value.trim()) return true
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters long.')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (profileUrl && !validateUrl(profileUrl)) {
      setError('Please enter a valid URL for profile picture.')
      return
    }

    setLoading(true)
    try {
      const updatedUser = await apiService.updateProfile({
        name: name.trim(),
        email: email.trim(),
        profileUrl: profileUrl.trim() || null,
      })

      setSuccess('Profile updated successfully!')

      // Update auth context user
      if (authUser) {
        authUser.name = updatedUser.name
        authUser.email = updatedUser.email
        authUser.profileUrl = updatedUser.profileUrl
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError(null)
    setDeleting(true)
    try {
      await apiService.deleteAccount()
      await logout()
      navigate('/')
    } catch (err) {
      setDeleteError(getErrorMessage(err))
      setDeleting(false)
    }
  }

  if (fetching) {
    return <Loading message="Loading profile..." />
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Profile Settings</h2>
        <p className="auth-subtitle">Manage your account information</p>

        {authUser && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '0.75rem' }}>
            <p style={{ margin: '0.25rem 0', color: '#cbd5f5' }}>
              <strong style={{ color: '#e2e8f0' }}>Role:</strong> {authUser.role}
            </p>
            <p style={{ margin: '0.25rem 0', color: '#cbd5f5' }}>
              <strong style={{ color: '#e2e8f0' }}>Member since:</strong>{' '}
              {new Date(authUser.createdAt).toLocaleDateString()}
            </p>
            {authUser.profileUrl && (
              <div style={{ marginTop: '1rem' }}>
                <img
                  src={authUser.profileUrl}
                  alt="Profile"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}
          </div>
        )}

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
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              disabled={loading}
              required
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="profileUrl">Profile Picture URL</label>
            <input
              id="profileUrl"
              type="url"
              value={profileUrl}
              onChange={(event) => setProfileUrl(event.target.value)}
              placeholder="https://example.com/photo.jpg"
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Updating…' : 'Update Profile'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowChangePassword(!showChangePassword)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              color: '#a5b4fc',
              fontSize: '0.9rem',
              cursor: 'pointer',
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
            {showChangePassword ? 'Hide Change Password' : 'Change Password'}
          </button>
          <Link
            to="/dashboard"
            style={{
              color: '#a5b4fc',
              textDecoration: 'none',
              fontSize: '0.9rem',
              padding: '0.75rem 1.5rem',
            }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {showChangePassword && (
        <ChangePassword
          onSuccess={() => setShowChangePassword(false)}
          onCancel={() => setShowChangePassword(false)}
        />
      )}

      <TwoFactorSettings />

      <div className="auth-card" style={{ marginTop: '2rem', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Danger Zone</h3>
        <p className="auth-subtitle" style={{ color: '#fca5a5', marginBottom: '1.5rem' }}>
          Permanently delete your account and all associated data
        </p>

        {deleteError && (
          <div className="error-message" role="alert" style={{ marginBottom: '1rem' }}>
            {deleteError}
          </div>
        )}

        {!showDeleteConfirmation ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirmation(true)}
            disabled={deleting}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#fca5a5',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              if (!deleting) {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                e.currentTarget.style.borderColor = '#ef4444'
              }
            }}
            onMouseLeave={(e) => {
              if (!deleting) {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
              }
            }}
          >
            Delete Account
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                padding: '1rem',
                borderRadius: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <p style={{ color: '#fca5a5', margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                Are you sure you want to delete your account?
              </p>
              <p style={{ color: '#fca5a5', margin: 0, fontSize: '0.9rem' }}>
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.9rem',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                  transition: 'all 200ms ease',
                }}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete My Account'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmation(false)
                  setDeleteError(null)
                }}
                disabled={deleting}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#a5b4fc',
                  fontSize: '0.9rem',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

