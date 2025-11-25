import { useState } from 'react'
import type { FormEvent } from 'react'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // API wiring will land in a future commit; for now we just log.
    console.log('signup', { name, email, password })
  }

  return (
    <section className="auth-container">
      <div className="auth-card">
        <h2>Create an account</h2>
        <p className="auth-subtitle">Sign up to start testing Authify flows.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="form-group">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Rishi Tiwari"
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
              required
            />
          </label>

          <button type="submit" className="auth-button">
            Sign up
          </button>
        </form>
      </div>
    </section>
  )
}

