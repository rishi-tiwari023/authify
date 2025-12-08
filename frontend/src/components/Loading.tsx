import './Login.css'

interface LoadingProps {
  message?: string
}

export default function Loading({ message = 'Loading...' }: LoadingProps) {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <p className="auth-subtitle">{message}</p>
      </div>
    </div>
  )
}

