import { useState } from 'react'
import type { FormEvent } from 'react'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      console.log('signup', { name, email, password })
      setLoading(false)
    }, 600)
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
              placeholder="you@example.com"
              disabled={loading}
              required
            />
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
          </label>

          <label className="form-group">
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              disabled={loading}
              required
              minLength={8}
            />
          </label>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
      </div>
    </section>
  )
}

