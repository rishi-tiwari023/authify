import { Component } from 'react'
import type { ReactNode } from 'react'
import './Login.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-container">
          <div className="auth-card">
            <h2>Something went wrong</h2>
            <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <div
              style={{
                padding: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <p style={{ color: '#fca5a5', fontSize: '0.9rem', margin: 0 }}>
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
            <button
              type="button"
              className="auth-button"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

