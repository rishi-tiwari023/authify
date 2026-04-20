import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiService } from '../services/api'
import { getErrorMessage } from '../utils/errorMessages'
import Loading from './Loading'
import { Lock, ShieldCheck, AlertTriangle } from 'lucide-react'
import './Login.css'

export default function Profile() {
  const { user: authUser } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

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

  if (fetching) {
    return <Loading message="Loading profile..." />
  }

  return (
    <div className="auth-container" style={{ minHeight: '100vh', height: 'auto', padding: '4rem 1rem', alignItems: 'flex-start' }}>
      <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="auth-card" style={{ margin: 0, width: '100%', maxWidth: 'none' }}>
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
                      border: '2px solid rgba(99, 102, 241, 0.3)',
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

          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ color: '#e2e8f0', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Account Actions</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <Link
                to="/change-password"
                className="action-card"
                style={{
                  padding: '1.25rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  borderRadius: '1rem',
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  transition: 'all 200ms ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.borderColor = '#6366f1'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center' }}><Lock size={24} /></span>
                <strong style={{ fontSize: '1rem' }}>Change Password</strong>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Update your secret credentials</span>
              </Link>

              <Link
                to="/two-factor"
                className="action-card"
                style={{
                  padding: '1.25rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  borderRadius: '1rem',
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  transition: 'all 200ms ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.borderColor = '#6366f1'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center' }}><ShieldCheck size={24} /></span>
                <strong style={{ fontSize: '1rem' }}>Two-Factor Auth</strong>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Add an extra layer of security</span>
              </Link>

              <Link
                to="/delete"
                className="action-card"
                style={{
                  padding: '1.25rem',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderRadius: '1rem',
                  color: '#fca5a5',
                  textDecoration: 'none',
                  transition: 'all 200ms ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'
                  e.currentTarget.style.borderColor = '#ef4444'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center' }}><AlertTriangle size={24} /></span>
                <strong style={{ fontSize: '1rem' }}>Delete Account</strong>
                <span style={{ fontSize: '0.85rem', color: '#fca5a5', opacity: 0.8 }}>Permanently remove all data</span>
              </Link>
            </div>

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <Link
                to="/dashboard"
                style={{
                  color: '#cbd5f5',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  transition: 'all 200ms ease',
                  display: 'inline-block'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
                }}
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}