import { useAuth } from '../context/AuthContext'
import { useReminders } from '../context/RemindersContext'
import { logoutUser } from '../services/authService'
import { useState, useEffect, useMemo } from 'react'
import { subscribeToUserGroups } from '../services/groupsService'
import Header from '../components/layout/Header'
import { LogoutIcon } from '../components/shared/Icons'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const { reminders } = useReminders()
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (!user) return
    return subscribeToUserGroups(user.uid, setGroups)
  }, [user])

  const ownCount = useMemo(() => reminders.filter(r => !r.isShared).length, [reminders])
  const sharedCount = useMemo(() => reminders.filter(r => r.isShared && r.status === 'accepted').length, [reminders])
  const highCount = useMemo(() => reminders.filter(r => r.importance === 'high' && !r.isShared).length, [reminders])

  const handleLogout = async () => {
    try { await logoutUser() }
    catch { toast.error('Error al cerrar sesión') }
  }

  const initials = (profile?.displayName || user?.displayName || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      <Header title="Mi Perfil" />
      <div className="page-content">
        <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Avatar + name */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '28px 20px' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--violet), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', fontWeight: 800, color: '#fff',
              boxShadow: 'var(--shadow-violet)',
              overflow: 'hidden'
            }}>
              {user?.photoURL
                ? <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ marginBottom: 4 }}>{profile?.displayName || user?.displayName || 'Usuario'}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user?.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{ownCount}</div>
              <div className="stat-label">Notas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{groups.length}</div>
              <div className="stat-label">Grupos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{highCount}</div>
              <div className="stat-label">Urgentes</div>
            </div>
          </div>

          {/* Info cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="section-title" style={{ marginBottom: 4 }}>Cuenta</div>

            {[
              { label: 'Email', value: user?.email },
              { label: 'Nombre', value: profile?.displayName || user?.displayName },
              { label: 'Mensajes recibidos', value: sharedCount },
              { label: 'Grupos activos', value: groups.length },
            ].map(({ label, value }) => (
              <div key={label} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{label}</span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* App info */}
          <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700, marginBottom: 4, background: 'linear-gradient(135deg, var(--violet-light), var(--teal))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SecuritySystem v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              App de notas personales y grupales con sincronización en tiempo real
            </p>
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Created by: José López-Romero Moraleda
            </div>
          </div>

          {/* Logout */}
          <button className="btn btn-danger btn-full" onClick={handleLogout} style={{ padding: '14px' }}>
            <LogoutIcon /> Cerrar sesión
          </button>

        </div>
      </div>
    </>
  )
}
