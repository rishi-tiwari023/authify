import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../utils/errorMessages'
import { useState } from 'react'
import './Login.css'

export default function DeleteAccount() {
    const { logout } = useAuth()
    const navigate = useNavigate()
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const handleDeleteAccount = async () => {
        setDeleteError(null)
        setDeleting(true)
        try {
            await apiService.deleteAccount()
            await logout()
            navigate('/')
        } catch (err) {
            setDeleteError(getErrorMessage(err))
            setDeleting(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card" style={{ maxWidth: '480px', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <h2 style={{ color: '#ef4444' }}>Delete Account</h2>
                <p className="auth-subtitle" style={{ color: '#fca5a5', marginBottom: '2rem' }}>
                    Permanently delete your account and all associated data. This action cannot be undone.
                </p>

                {deleteError && (
                    <div className="error-message" role="alert" style={{ marginBottom: '1.5rem' }}>
                        {deleteError}
                    </div>
                )}

                {!showDeleteConfirmation ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div
                            style={{
                                padding: '1.25rem',
                                borderRadius: '0.75rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                fontSize: '0.95rem',
                                lineHeight: '1.5'
                            }}
                        >
                            Warning: Deleting your account will remove all your data, profile information, and any settings associated with your account.
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirmation(true)}
                                disabled={deleting}
                                className="auth-button"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                    color: '#fca5a5',
                                    flex: 1
                                }}
                            >
                                Delete My Account
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/profile')}
                                className="auth-button"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                    color: '#cbd5f5',
                                    flex: 1
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div
                            style={{
                                padding: '1.25rem',
                                borderRadius: '0.75rem',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                            }}
                        >
                            <p style={{ color: '#fca5a5', margin: '0 0 0.75rem 0', fontWeight: '600', fontSize: '1.1rem' }}>
                                Final Confirmation
                            </p>
                            <p style={{ color: '#fca5a5', margin: 0, fontSize: '0.95rem' }}>
                                Are you absolutely sure? There is no way to recover your account once deleted.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={deleting}
                                className="auth-button"
                                style={{
                                    background: '#ef4444',
                                    border: 'none',
                                    color: '#fff',
                                    flex: 2
                                }}
                            >
                                {deleting ? 'Deleting…' : 'Yes, Delete Permanently'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteConfirmation(false)
                                    setDeleteError(null)
                                }}
                                disabled={deleting}
                                className="auth-button"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                    color: '#cbd5f5',
                                    flex: 1
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
