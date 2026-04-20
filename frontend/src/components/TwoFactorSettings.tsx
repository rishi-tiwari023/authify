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
    const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false)
    const [isViewConfirmOpen, setIsViewConfirmOpen] = useState(false)
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

    const handleRegenerateCodes = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password) return

        setLoading(true)
        setError(null)
        try {
            const codes = await apiService.regenerateBackupCodes(password)
            setBackupCodes(codes)
            setIsRegenerateConfirmOpen(false)
            setIsBackupOpen(true)
            setPassword('')
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }
    const handleViewCodes = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password) return

        setLoading(true)
        setError(null)
        try {
            const codes = await apiService.getBackupCodes(password)
            setBackupCodes(codes)
            setIsViewConfirmOpen(false)
            setIsBackupOpen(true)
            setPassword('')
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
        <>
            <div className="auth-container">
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
                                <button onClick={() => setIsViewConfirmOpen(true)} className="primary-button" disabled={loading}>
                                    View Backup Codes
                                </button>
                                <button onClick={() => setIsRegenerateConfirmOpen(true)} className="secondary-button" disabled={loading}>
                                    Regenerate Backup Codes
                                </button>
                                <button onClick={() => setIsDisableOpen(true)} className="danger-button" disabled={loading}>
                                    Disable 2FA
                                </button>
                            </>
                        )}
                    </div>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <button
                            onClick={() => window.history.back()}
                            className="secondary-button"
                            style={{ background: 'transparent', border: 'none', color: '#a5b4fc', fontSize: '0.9rem' }}
                        >
                            Back
                        </button>
                    </div>
                </div>
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

            {/* Regenerate Confirmation Modal */}
            {isRegenerateConfirmOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={() => setIsRegenerateConfirmOpen(false)}>×</button>
                        <h3>Regenerate Backup Codes</h3>
                        <p>
                            Are you sure? Your old backup codes will stop working immediately.
                        </p>

                        <form onSubmit={handleRegenerateCodes} className="verify-form">
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
                                <button type="button" onClick={() => setIsRegenerateConfirmOpen(false)} className="secondary-button" disabled={loading}>
                                    Cancel
                                </button>
                                <button type="submit" className="primary-button" disabled={loading || !password}>
                                    {loading ? 'Regenerating...' : 'Regenerate Codes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Confirmation Modal */}
            {isViewConfirmOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={() => setIsViewConfirmOpen(false)}>×</button>
                        <h3>View Backup Codes</h3>
                        <p>
                            Please enter your password to view your existing backup codes.
                        </p>

                        <form onSubmit={handleViewCodes} className="verify-form">
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
                                <button type="button" onClick={() => setIsViewConfirmOpen(false)} className="secondary-button" disabled={loading}>
                                    Cancel
                                </button>
                                <button type="submit" className="primary-button" disabled={loading || !password}>
                                    {loading ? 'Verifying...' : 'View Codes'}
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
                        <h3>Your Backup Codes</h3>
                        <p>
                            Save these codes securely. Each code can be used once to log in if you lose your 2FA device.
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
        </>
    )
}
