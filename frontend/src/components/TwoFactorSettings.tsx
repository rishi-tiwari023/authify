import { useState } from 'react'
import { apiService } from '../services/api'
import { getErrorMessage } from '../utils/errorMessages'
import { useAuth } from '../contexts/AuthContext'
import TwoFactorSetup from './TwoFactorSetup'
import './TwoFactorSettings.css'

export default function TwoFactorSettings() {
    const { user, refreshUser } = useAuth()
    const [isSetupOpen, setIsSetupOpen] = useState(false)
    const [isDisableOpen, setIsDisableOpen] = useState(false)
    const [isBackupOpen, setIsBackupOpen] = useState(false)
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [backupCodes, setBackupCodes] = useState<string[]>([])

    const handleDisable = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password) return

        setLoading(true)
        setError(null)
        try {
            await apiService.disable2FA(password)
            await refreshUser()
            setIsDisableOpen(false)
            setPassword('')
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleRegenerateCodes = async () => {
        if (!confirm('Are you sure? Old backup codes will stop working.')) return

        setLoading(true)
        setError(null)
        try {
            const codes = await apiService.regenerateBackupCodes()
            setBackupCodes(codes)
            setIsBackupOpen(true)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleSetupComplete = async () => {
        await refreshUser()
        setIsSetupOpen(false)
    }

    if (!user) return null

    return (
        <div className="settings-2fa-container">
            <div className="settings-header">
                <div>
                    <h3>Two-Factor Authentication</h3>
                    <p className="text-secondary">
                        Add an extra layer of security to your account.
                    </p>
                </div>
                <div className={`status-badge ${user.twoFactorEnabled ? 'enabled' : 'disabled'}`}>
                    {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="settings-actions">
                {!user.twoFactorEnabled ? (
                    <button onClick={() => setIsSetupOpen(true)} className="primary-button">
                        Enable 2FA
                    </button>
                ) : (
                    <>
                        <button onClick={handleRegenerateCodes} className="secondary-button" disabled={loading}>
                            Regenerate Backup Codes
                        </button>
                        <button onClick={() => setIsDisableOpen(true)} className="danger-button" disabled={loading}>
                            Disable 2FA
                        </button>
                    </>
                )}
            </div>

            {/* Setup Modal */}
            {isSetupOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={() => setIsSetupOpen(false)}>×</button>
                        <TwoFactorSetup
                            onComplete={handleSetupComplete}
                            onCancel={() => setIsSetupOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Disable Modal */}
            {isDisableOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={() => setIsDisableOpen(false)}>×</button>
                        <h3>Disable Two-Factor Authentication</h3>
                        <p className="warning-text">
                            Are you sure? This will remove the extra security from your account.
                        </p>

                        <form onSubmit={handleDisable} className="verify-form">
                            <div className="form-group">
                                <label htmlFor="password">Confirm Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="setup-actions">
                                <button type="button" onClick={() => setIsDisableOpen(false)} className="secondary-button" disabled={loading}>
                                    Cancel
                                </button>
                                <button type="submit" className="danger-button" disabled={loading || !password}>
                                    {loading ? 'Disabling...' : 'Disable 2FA'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Backup Codes Modal */}
            {isBackupOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={() => setIsBackupOpen(false)}>×</button>
                        <h3>New Backup Codes</h3>
                        <p>
                            Save these codes securely. Previous backup codes are now invalid.
                        </p>
                        <div className="backup-codes-list">
                            {backupCodes.map((code, i) => (
                                <div key={i} className="backup-code-item">{code}</div>
                            ))}
                        </div>
                        <button onClick={() => setIsBackupOpen(false)} className="primary-button full-width">
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
