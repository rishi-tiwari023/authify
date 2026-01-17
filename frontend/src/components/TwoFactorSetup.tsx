import { useState } from 'react'
import { apiService } from '../services/api'
import { getErrorMessage } from '../utils/errorMessages'
import './TwoFactorSetup.css'

interface TwoFactorSetupProps {
    onComplete: () => void
    onCancel: () => void
}

export default function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
    const [step, setStep] = useState<'initial' | 'verify' | 'success'>('initial')
    const [secret, setSecret] = useState<string>('')
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
    const [token, setToken] = useState('')
    const [backupCodes, setBackupCodes] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const startSetup = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiService.setup2FA()
            setSecret(data.secret)
            setQrCodeUrl(data.dataUrl)
            setStep('verify')
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token || token.length !== 6) return

        setLoading(true)
        setError(null)
        try {
            const codes = await apiService.enable2FA(token)
            setBackupCodes(codes)
            setStep('success')
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const copyBackupCodes = () => {
        const text = backupCodes.join('\n')
        navigator.clipboard.writeText(text)
        // could show a toast here
    }

    if (step === 'initial') {
        return (
            <div className="setup-2fa-container">
                <h3>Enable Two-Factor Authentication</h3>
                <p>
                    Protect your account with an extra layer of security. Once configured, you'll be required to enter both your password and an authentication code from your mobile phone in order to sign in.
                </p>

                {error && <div className="error-message">{error}</div>}

                <div className="setup-actions">
                    <button type="button" onClick={onCancel} className="secondary-button" disabled={loading}>
                        Cancel
                    </button>
                    <button onClick={startSetup} className="primary-button" disabled={loading}>
                        {loading ? 'Starting...' : 'Start Setup'}
                    </button>
                </div>
            </div>
        )
    }

    if (step === 'verify') {
        return (
            <div className="setup-2fa-container">
                <h3>Scan QR Code</h3>
                <p>
                    Scan the image below with the authenticator app on your phone.
                </p>

                {error && <div className="error-message">{error}</div>}

                <div className="qr-code-section">
                    {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" className="qr-code-image" />}

                    <div className="secret-key-section">
                        <p className="text-sm text-gray-400">Or enter this code manually:</p>
                        <p className="secret-key">{secret}</p>
                    </div>
                </div>

                <form onSubmit={handleVerify} className="verify-form">
                    <div className="form-group">
                        <label htmlFor="token">Verification Code</label>
                        <input
                            id="token"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={token}
                            onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="setup-actions">
                        <button type="button" onClick={onCancel} className="secondary-button" disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="primary-button" disabled={loading || token.length !== 6}>
                            {loading ? 'Verifying...' : 'Verify & Enable'}
                        </button>
                    </div>
                </form>
            </div>
        )
    }

    return (
        <div className="setup-2fa-container">
            <h3>Two-Factor Authentication Enabled</h3>
            <p className="success-text">
                Success! Your account is now protected with 2FA.
            </p>

            <div className="backup-codes-section">
                <p>
                    <strong>Save these backup codes!</strong> If you lose your device, these codes will be the only way to access your account.
                </p>

                <div className="backup-codes-grid">
                    {backupCodes.map((code, index) => (
                        <div key={index} className="backup-code">{code}</div>
                    ))}
                </div>

                <div className="setup-actions">
                    <button type="button" onClick={copyBackupCodes} className="secondary-button">
                        Copy Codes
                    </button>
                    <button onClick={onComplete} className="primary-button">
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
