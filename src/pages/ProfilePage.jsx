import { useAuth } from '../context/AuthContext'
import { useReminders } from '../context/RemindersContext'
import { logoutUser, updateUserSettings } from '../services/authService'
import { useState, useEffect, useMemo } from 'react'
import { subscribeToUserGroups } from '../services/groupsService'
import { deleteOldMessages } from '../services/remindersService'
import Header from '../components/layout/Header'
import Modal from '../components/shared/Modal'
import { LogoutIcon } from '../components/shared/Icons'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const { reminders } = useReminders()
  const [groups, setGroups] = useState([])
  const [retentionDays, setRetentionDays] = useState(7)
  const [savingRetention, setSavingRetention] = useState(false)
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  useEffect(() => {
    if (!user) return
    return subscribeToUserGroups(user.uid, setGroups)
  }, [user])

  // Días de retención guardados en el perfil (7 por defecto)
  useEffect(() => {
    const saved = Number(profile?.retentionDays)
    setRetentionDays(Number.isFinite(saved) && saved >= 1 ? Math.floor(saved) : 7)
  }, [profile])

  const days = Math.max(1, Math.floor(Number(retentionDays) || 7))
  const ownCount = useMemo(() => reminders.filter(r => !r.isShared).length, [reminders])
  const sharedCount = useMemo(() => reminders.filter(r => r.isShared && r.status === 'accepted').length, [reminders])

  // Mensajes de esta cuenta más antiguos que la retención configurada
  const expiredCount = useMemo(() => {
    const toMillis = (value) => {
      if (!value) return 0
      if (typeof value.toMillis === 'function') return value.toMillis()
      if (Number.isFinite(value.seconds)) return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000)
      const parsed = new Date(value).getTime()
      return Number.isFinite(parsed) ? parsed : 0
    }
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return reminders.filter(message => {
      const millis = toMillis(message.createdAt)
      return millis > 0 && millis < cutoff
    }).length
  }, [reminders, days])

  const handleLogout = async () => {
    try { await logoutUser() }
    catch { toast.error('Error al cerrar sesión') }
  }

  const handleSaveRetention = async () => {
    setSavingRetention(true)
    try {
      await updateUserSettings(user.uid, { retentionDays: days })
      await refreshProfile()
      toast.success('Retención guardada')
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar la retención')
    } finally {
      setSavingRetention(false)
    }
  }

  const handleCleanupConfirm = async () => {
    setCleanupOpen(false)
    setCleaning(true)
    try {
      const { deletedMessages, deletedLogs } = await deleteOldMessages(user.uid, days)
      if (deletedMessages === 0 && deletedLogs === 0) {
        toast('No hay mensajes antiguos que eliminar')
      } else {
        const logsPart = deletedLogs > 0 ? ` y ${deletedLogs} registros de envío` : ''
        toast.success(`Se eliminaron ${deletedMessages} mensajes${logsPart}`)
      }
    } catch (error) {
      toast.error(error.message || 'No se pudieron eliminar los mensajes')
    } finally {
      setCleaning(false)
    }
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
              <div className="stat-value">{sharedCount}</div>
              <div className="stat-label">Recibidos</div>
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

          {/* Privacy / message retention */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="section-title" style={{ marginBottom: 4 }}>Privacidad</div>

            <div className="card" style={{ padding: '14px 16px' }}>
              <label className="form-label" htmlFor="retentionDays" style={{ marginBottom: 8 }}>
                Eliminar mensajes después de
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  id="retentionDays"
                  className="form-input"
                  type="number"
                  min="1"
                  max="3650"
                  value={retentionDays}
                  onChange={(event) => setRetentionDays(event.target.value)}
                  style={{ width: 100 }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>días</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={handleSaveRetention}
                  disabled={savingRetention}
                >
                  {savingRetention ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
              <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                Se aplica a tu cuenta: tus mensajes y las copias que has recibido. Cada
                persona configura la suya.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-danger btn-full"
              style={{ padding: '14px' }}
              onClick={() => setCleanupOpen(true)}
              disabled={cleaning}
            >
              {cleaning
                ? 'Eliminando…'
                : `Eliminar mensajes de más de ${days} días${expiredCount > 0 ? ` (${expiredCount})` : ''}`}
            </button>
          </div>

          <Modal open={cleanupOpen} onClose={() => setCleanupOpen(false)} title="Eliminar mensajes antiguos">
            <p style={{ marginBottom: 20, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              Se eliminarán de tu cuenta <strong>{expiredCount} mensajes</strong> con más de{' '}
              <strong>{days} días</strong> y sus registros de envío. Esta acción no se
              puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCleanupOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleCleanupConfirm}>
                Eliminar
              </button>
            </div>
          </Modal>

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
