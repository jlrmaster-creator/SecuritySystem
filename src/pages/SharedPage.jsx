import { useMemo } from 'react'
import { useReminders } from '../context/RemindersContext'
import { acceptSharedReminder, rejectSharedReminder } from '../services/remindersService'
import Header from '../components/layout/Header'
import { CheckIcon, XIcon } from '../components/shared/Icons'
import { formatDateTime } from '../utils/dateUtils'
import { getCategoryById, importanceBadgeClass, getImportanceById } from '../utils/colorUtils'
import toast from 'react-hot-toast'

export default function SharedPage() {
  const { reminders } = useReminders()

  const pending = useMemo(() => reminders.filter(r => r.isShared && r.status === 'pending'), [reminders])
  const accepted = useMemo(() => reminders.filter(r => r.isShared && r.status === 'accepted'), [reminders])

  const handleAccept = async (r) => {
    try {
      await acceptSharedReminder(r.id, null)
      toast.success('Mensaje aceptado ✓')
    } catch (e) { console.error('Error al aceptar:', e); toast.error('Error al aceptar') }
  }

  const handleReject = async (r) => {
    try {
      await rejectSharedReminder(r.id, null)
      toast.success('Rechazado')
    } catch (e) { console.error('Error al rechazar:', e); toast.error('Error al rechazar') }
  }

  const ReminderRow = ({ r, showActions }) => {
    const cat = getCategoryById(r.category)
    const imp = getImportanceById(r.importance)
    const color = r.color || '#7C3AED'
    return (
      <div className="card reminder-card" style={{ paddingLeft: 20 }}>
        <div className="reminder-card-accent" style={{ background: color }} />
        <div className="reminder-card-inner">
          <div className="received-badge" style={{ marginBottom: 6 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            De {r.sharedFromName || 'un contacto'}
          </div>
          <div className="reminder-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="reminder-title truncate">{r.title}</div>
              {r.description && <div className="reminder-desc">{r.description}</div>}
            </div>
            <span className={importanceBadgeClass(r.importance)} style={{ flexShrink: 0 }}>{imp?.emoji}</span>
          </div>
          <div className="reminder-meta">
            <span className="reminder-date">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {formatDateTime(r.dateTime)}
            </span>
            {cat && <span className="badge badge-category">{cat.emoji} {cat.label}</span>}
          </div>
          {showActions && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-teal btn-sm" style={{ flex: 1 }} onClick={() => handleAccept(r)}>
                <CheckIcon /> Aceptar
              </button>
              <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleReject(r)}>
                <XIcon /> Rechazar
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Header title="Recibidos" />
      <div className="page-content">
        <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Pending */}
          <div>
            <div className="section-header">
              <span className="section-title">⏳ Pendientes de aceptar</span>
              {pending.length > 0 && (
                <span style={{
                  background: 'var(--pink)', color: '#fff', borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px'
                }}>{pending.length}</span>
              )}
            </div>
            {pending.length > 0 ? (
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.map(r => <ReminderRow key={r.id} r={r} showActions />)}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Sin mensajes pendientes 🎉
              </div>
            )}
          </div>

          {/* Accepted */}
          {accepted.length > 0 && (
            <div>
              <div className="section-header"><span className="section-title">✅ Aceptados</span></div>
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {accepted.map(r => <ReminderRow key={r.id} r={r} showActions={false} />)}
              </div>
            </div>
          )}

          {pending.length === 0 && accepted.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>
              <div className="empty-state-title">Sin mensajes recibidos</div>
              <p className="empty-state-text">Cuando alguien te comparta un mensaje aparecerá aquí</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
