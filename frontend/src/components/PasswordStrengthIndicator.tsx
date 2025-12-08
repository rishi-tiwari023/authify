import './Login.css'

interface PasswordStrengthIndicatorProps {
  password: string
}

interface StrengthLevel {
  level: 'weak' | 'fair' | 'good' | 'strong'
  score: number
  label: string
  color: string
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const calculateStrength = (pwd: string): StrengthLevel => {
    if (!pwd) {
      return { level: 'weak', score: 0, label: '', color: '#6b7280' }
    }

    let score = 0
    
    // Length checks
    if (pwd.length >= 8) score += 1
    if (pwd.length >= 12) score += 1
    
    // Character variety checks
    if (/[a-z]/.test(pwd)) score += 1 // lowercase
    if (/[A-Z]/.test(pwd)) score += 1 // uppercase
    if (/[0-9]/.test(pwd)) score += 1 // number
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1 // special character

    if (score <= 2) {
      return { level: 'weak', score, label: 'Weak', color: '#ef4444' }
    } else if (score === 3 || score === 4) {
      return { level: 'fair', score, label: 'Fair', color: '#f59e0b' }
    } else if (score === 5) {
      return { level: 'good', score, label: 'Good', color: '#3b82f6' }
    } else {
      return { level: 'strong', score, label: 'Strong', color: '#22c55e' }
    }
  }

  const strength = calculateStrength(password)
  const percentage = (strength.score / 6) * 100

  if (!password) {
    return null
  }

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <div
          style={{
            flex: 1,
            height: '4px',
            background: '#374151',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              background: strength.color,
              transition: 'all 0.3s ease',
            }}
          />
        </div>
        {strength.label && (
          <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 500 }}>
            {strength.label}
          </span>
        )}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
        <PasswordRequirements password={password} />
      </div>
    </div>
  )
}

function PasswordRequirements({ password }: { password: string }) {
  const requirements = [
    { test: (pwd: string) => pwd.length >= 8, label: 'At least 8 characters' },
    { test: (pwd: string) => /[a-z]/.test(pwd), label: 'One lowercase letter' },
    { test: (pwd: string) => /[A-Z]/.test(pwd), label: 'One uppercase letter' },
    { test: (pwd: string) => /[0-9]/.test(pwd), label: 'One number' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
      {requirements.map((req, idx) => {
        const met = req.test(password)
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: met ? '#22c55e' : '#6b7280' }}>
              {met ? '✓' : '○'}
            </span>
            <span style={{ color: met ? '#9ca3af' : '#6b7280' }}>{req.label}</span>
          </div>
        )
      })}
    </div>
  )
}

