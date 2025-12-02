import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Footer from './components/Footer'
import Login from './components/Login'
import Signup from './components/Signup'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import Profile from './components/Profile'
import AdminDashboard from './components/AdminDashboard'

const stats = [
  { label: 'Active users', value: 'null' },
  { label: 'Auth uptime', value: '99.99%' },
  { label: 'SLA response (mins)', value: 'null' },
]

const features = [
  {
    title: 'Secure by default',
    description: 'Rate limiting, sanitization, and layered defenses without extra code.',
    icon: '🛡️',
  },
  {
    title: 'Password reset flows',
    description: 'Battle-tested reset flows with branded emails and expiring tokens.',
    icon: '✉️',
  },
  {
    title: 'Role-based control',
    description: 'Admin/User segmentation baked in so you ship dashboards safely.',
    icon: '🔑',
  },
  {
    title: 'Observability hooks',
    description: 'Structured logging and metrics so incidents are traceable in minutes.',
    icon: '📊',
  },
]

const timeline = [
  {
    title: 'Provision Authify backend',
    detail: 'Configure env vars & connect Postgres in under 5 minutes.',
  },
  {
    title: 'Plug in the SDK',
    detail: 'Drop-in hooks for signup, login, and session refresh.',
  },
  {
    title: 'Launch confidently',
    detail: 'Continuous token cleanup and automated hardening guardrails.',
  },
]

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function LandingPage() {
  return (
    <div className="app-shell">
      <header className="hero" role="banner">
        <span className="hero-badge">Production-ready auth</span>
        <h1 className="hero-title">
          Your users deserve seamless sign-in experiences
        </h1>
        <p className="hero-copy">
          Authify pairs a hardened Node backend with a modern React experience so you
          focus on roadmap work, not auth edge cases.
        </p>
        <div className="hero-actions">
          <button className="primary" type="button">Launch demo</button>
          <button className="ghost" type="button">View docs</button>
        </div>
        <div className="hero-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-label">{stat.label}</p>
            </div>
          ))}
        </div>
      </header>

      <main className="content" role="main">
        <section className="panel">
          <div>
            <p className="eyebrow">Why Authify</p>
            <h2>Secure foundations, delightful UX</h2>
            <p className="section-copy">
              Every flow is validated, sanitized, and monitored out of the box. Tie it to your UI
              and go live faster than ever.
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature) => (
              <article key={feature.title} className="feature-card">
                <span className="feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel timeline">
          <div>
            <p className="eyebrow">Go live checklist</p>
            <h2>From zero to production in three steps</h2>
          </div>
          <ol role="list">
            {timeline.map((item) => (
              <li key={item.title}>
                <div className="step-marker" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel trust">
          <div>
            <p className="eyebrow">Trusted by builders</p>
            <h2>Ship auth with confidence</h2>
            <p className="section-copy">
              Teams lean on Authify for password hygiene, auditable resets, and delightful onboarding journeys.
            </p>
          </div>
          <div className="trust-grid">
            <div>
              <p className="stat-value">null</p>
              <p className="stat-label">Engineering teams onboarded</p>
            </div>
            <div>
              <p className="stat-value">null</p>
              <p className="stat-label">Median token refresh</p>
            </div>
            <div>
              <p className="stat-value">24/7</p>
              <p className="stat-label">Support coverage</p>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </div>
  )
}

export default App