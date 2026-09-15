import { useState } from 'react'
import Modal from '../shared/Modal'
import ReminderDetail from './ReminderDetail'

export default function ReminderCard({ reminder, onEdit, onDelete, onReply, onOpen, threadColor, threadBackground, isOwn, isRead }) {
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <>
      <div
        className="card clickable reminder-card anim-slide-up"
        onClick={() => { onOpen?.(); setDetailOpen(true) }}
        style={{ paddingLeft: '20px', background: threadBackground || undefined }}
      >
        {/* Accent bar */}
        <div className="reminder-card-accent" style={{ background: threadColor || 'var(--violet)' }} />

        <div className="reminder-card-inner">
          <div className="reminder-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              {reminder.isShared && (
                <div className="received-badge" style={{ marginBottom: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  De {reminder.sharedFromName || 'un contacto'}
                </div>
              )}
              <div className="reminder-title truncate">{reminder.title}</div>
              {reminder.description && (
                <div className="reminder-desc">{reminder.description}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {onReply && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={(event) => { event.stopPropagation(); onReply(reminder) }}
                >
                  Responder
                </button>
              )}
              {isOwn && <span className="badge" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>Tuyo</span>}
              {isOwn && isRead && <span className="badge" style={{ color: 'var(--teal-light)' }}>Leído</span>}
            </div>
          </div>
        </div>
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)}>
        <ReminderDetail
          reminder={reminder}
          onEdit={isOwn ? () => { setDetailOpen(false); onEdit(reminder) } : null}
          onDelete={isOwn ? () => { setDetailOpen(false); onDelete(reminder.id) } : null}
          onReply={onReply ? () => { setDetailOpen(false); onReply(reminder) } : null}
          canEdit={isOwn}
          canDelete={isOwn}
          onClose={() => setDetailOpen(false)}
        />
      </Modal>
    </>
  )
}
