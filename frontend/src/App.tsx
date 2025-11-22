import './App.css'

const stats = [
  { label: 'Active users', value: 'null' },
  { label: 'Auth uptime', value: '99.99%' },
  { label: 'SLA response (mins)', value: 'null' },
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
    </div>
  )
}

export default App
