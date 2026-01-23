import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiService } from '../services/api'
import type { User } from '../types/auth'
import { getErrorMessage } from '../utils/errorMessages'
import Loading from './Loading'
import './Login.css'

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await apiService.listUsers()
        setUsers(response.data)
        setFilteredUsers(response.data)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
    )
    setFilteredUsers(filtered)
  }, [searchQuery, users])

  const handleBanToggle = async (userId: string, currentBanStatus: boolean) => {
    try {
      const { user: updatedUser } = await apiService.banUser(userId, !currentBanStatus)

      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: updatedUser.isBanned } : u))
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  if (loading) {
    return <Loading message="Loading users..." />
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '1000px' }}>
        <h2>Admin Dashboard</h2>
        <p className="auth-subtitle">Manage all users</p>

        {error && (
          <div className="error-message" role="alert" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label htmlFor="search" style={{ marginBottom: '0.5rem' }}>
              Search Users
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, email, or role..."
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#e2e8f0',
                fontSize: '1rem',
                width: '100%',
              }}
            />
          </div>
        </div>

        {filteredUsers.length === 0 && users.length > 0 ? (
          <p className="auth-subtitle" style={{ textAlign: 'center', padding: '2rem' }}>
            No users found matching your search.
          </p>
        ) : filteredUsers.length === 0 ? (
          <p className="auth-subtitle" style={{ textAlign: 'center', padding: '2rem' }}>
            No users found.
          </p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                >
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Role</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Created</th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#e2e8f0', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user: User) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                      transition: 'background-color 200ms ease',
                      opacity: user.isBanned ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <td style={{ padding: '1rem', color: '#cbd5f5' }}>{user.name}</td>
                    <td style={{ padding: '1rem', color: '#cbd5f5' }}>{user.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          background: user.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                          color: user.role === 'ADMIN' ? '#a5b4fc' : '#cbd5f5',
                          border: `1px solid ${user.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {user.isBanned ? (
                        <span style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                          Banned
                        </span>
                      ) : (
                        <span style={{ color: '#22c55e', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                          Active
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleBanToggle(user.id, !!user.isBanned)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 200ms ease',
                          background: user.isBanned ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: user.isBanned ? '#4ade80' : '#f87171',
                          border: `1px solid ${user.isBanned ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = user.isBanned ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = user.isBanned ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                        }}
                      >
                        {user.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
          <Link
            to="/dashboard"
            style={{
              color: '#cbd5f5',
              textDecoration: 'none',
              fontSize: '0.9rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
            }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

