import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiService, type User } from '../services/api'
import './Login.css'

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const usersList = await apiService.listUsers()
        setUsers(usersList)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: '900px' }}>
          <p className="auth-subtitle">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '900px' }}>
        <h2>Admin Dashboard</h2>
        <p className="auth-subtitle">Manage all users</p>

        {error && (
          <div className="error-message" role="alert" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {users.length === 0 ? (
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
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      color: '#e2e8f0',
                      fontWeight: '600',
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      color: '#e2e8f0',
                      fontWeight: '600',
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      color: '#e2e8f0',
                      fontWeight: '600',
                    }}
                  >
                    Role
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      color: '#e2e8f0',
                      fontWeight: '600',
                    }}
                  >
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                      transition: 'background-color 200ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5f5' }}>
                      {user.name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5f5' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          background:
                            user.role === 'ADMIN'
                              ? 'rgba(99, 102, 241, 0.2)'
                              : 'rgba(148, 163, 184, 0.2)',
                          color: user.role === 'ADMIN' ? '#a5b4fc' : '#cbd5f5',
                          border: `1px solid ${
                            user.role === 'ADMIN'
                              ? 'rgba(99, 102, 241, 0.3)'
                              : 'rgba(148, 163, 184, 0.2)'
                          }`,
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5f5' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
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
              color: '#a5b4fc',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

