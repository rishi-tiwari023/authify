import { useState } from 'react'
import { apiService } from '../services/api'
import type { LoginResponse } from '../types/auth'
import { getErrorMessage } from '../utils/errorMessages'
import './TwoFactorVerify.css'

interface TwoFactorVerifyProps {
    userId: string
    rememberMe?: boolean
    onSuccess: (response: LoginResponse) => void
    onCancel: () => void
}

export default function TwoFactorVerify({ userId, rememberMe = false, onSuccess, onCancel }: TwoFactorVerifyProps) {
    const [token, setToken] = useState('')
    const [isBackupMode, setIsBackupMode] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token) return

        setLoading(true)
        setError(null)

        try {
            const response = await apiService.verify2FA(userId, token, rememberMe)
            onSuccess(response)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const toggleMode = () => {
        setIsBackupMode(!isBackupMode)
        setToken('')
        setError(null)
    }

    return (
        <div className="verify-2fa-container">
            <div className="verify-header">
                <span className="verify-icon">🔐</span>
                <h3>Two-Factor Authentication</h3>
                <p className="auth-subtitle">
                    {isBackupMode
                        ? 'Enter one of your 8-character backup codes.'
                        : 'Enter the 6-digit code from your authenticator app.'}
                </p>
            </div>

            {error && (
                <div className="error-message" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group verify-input-group">
                    <input
                        type="text"
                        className="code-input"
                        inputMode={isBackupMode ? "text" : "numeric"}
                        pattern={isBackupMode ? "[a-zA-Z0-9]*" : "[0-9]*"}
                        maxLength={isBackupMode ? 8 : 6}
                        value={token}
                        onChange={(e) => {
                            const val = e.target.value.toUpperCase()
                            if (isBackupMode) {
                                setToken(val.replace(/[^A-Z0-9]/g, ''))
                            } else {
                                setToken(val.replace(/\D/g, ''))
                            }
                        }}
                        placeholder={isBackupMode ? "BACKUP" : "000000"}
                        autoFocus
                        disabled={loading}
                    />
                </div>

                <button type="submit" className="auth-button submit-button" disabled={loading || !token}>
                    {loading ? 'Verifying...' : 'Verify'}
                </button>

                <div className="backup-mode-toggle">
                    <button type="button" onClick={toggleMode} className="link-button">
                        {isBackupMode ? 'Use Authenticator App' : 'Use Backup Code'}
                    </button>
                </div>

                <div className="backup-mode-toggle">
                    <button type="button" onClick={onCancel} className="link-button" style={{ color: '#94a3b8' }}>
                        Return to Login
                    </button>
                </div>
            </form>
        </div>
    )
}
