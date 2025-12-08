interface EmailValidationFeedbackProps {
  email: string
  touched?: boolean
}

export default function EmailValidationFeedback({ email, touched }: EmailValidationFeedbackProps) {
  if (!touched || !email) {
    return null
  }

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  
  if (isValid) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
        <span style={{ color: '#22c55e', fontSize: '0.75rem' }}>✓</span>
        <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Valid email address</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
      <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>⚠</span>
      <span style={{ color: '#f87171', fontSize: '0.75rem' }}>Please enter a valid email address</span>
    </div>
  )
}

