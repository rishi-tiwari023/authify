import './App.css'

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

function App() {
  return (
    <div className="app-shell">
      <header className="hero">
        <span className="hero-badge">Production-ready auth</span>
        <h1 className="hero-title">
          Your users deserve seamless sign-in experiences
        </h1>
        <p className="hero-copy">
          Authify pairs a hardened Node backend with a modern React experience so you
          focus on roadmap work, not auth edge cases.
        </p>
        <div className="hero-actions">
          <button className="primary">Launch demo</button>
          <button className="ghost">View docs</button>
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

      <main className="content">
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
      </main>
    </div>
  )
}

export default App
