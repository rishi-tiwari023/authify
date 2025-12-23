import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiService } from '../services/api'
import { getErrorMessage } from '../utils/errorMessages'

export default function VerifyEmail() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const navigate = useNavigate()

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
    const [message, setMessage] = useState('Verifying your email address...')

    useEffect(() => {
        if (!token) {
            setStatus('error')
            setMessage('Invalid verification link. No token provided.')
            return
        }

        const verify = async () => {
            try {
                await apiService.verifyEmail(token)
                setStatus('success')
                setMessage('Email verified successfully! You can now log in.')

                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login')
                }, 3000)
            } catch (err) {
                setStatus('error')
                setMessage(getErrorMessage(err))
            }
        }

        verify()
    }, [token, navigate])

    return (
        <section className="auth-container">
            <div className="auth-card" style={{ textAlign: 'center' }}>
                <h2>Email Verification</h2>

                <div style={{ margin: '2rem 0', fontSize: '3rem' }}>
                    {status === 'verifying' && '⏳'}
                    {status === 'success' && '✅'}
                    {status === 'error' && '❌'}
                </div>

                <p className="auth-subtitle" style={{ marginBottom: '2rem' }}>
                    {message}
                </p>

                {status === 'success' && (
                    <p style={{ fontSize: '0.875rem', color: '#666' }}>
                        Redirecting to login page...
                    </p>
                )}

                {status === 'error' && (
                    <button
                        type="button"
                        className="auth-button"
                        onClick={() => navigate('/login')}
                    >
                        Back to Login
                    </button>
                )}
            </div>
        </section>
    )
}
