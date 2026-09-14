import { useState } from 'react'
import Modal from '../shared/Modal'
import ReminderDetail from './ReminderDetail'

export default function ReminderCard({ reminder, onEdit, onDelete }) {
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <>
      <div
        className="card clickable reminder-card anim-slide-up"
        onClick={() => setDetailOpen(true)}
        style={{ paddingLeft: '20px' }}
      >
        {/* Accent bar */}
        <div className="reminder-card-accent" style={{ background: 'var(--violet)' }} />

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
          </div>
        </div>
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)}>
        <ReminderDetail
          reminder={reminder}
          onEdit={() => { setDetailOpen(false); onEdit(reminder) }}
          onDelete={() => { setDetailOpen(false); onDelete(reminder.id) }}
          onClose={() => setDetailOpen(false)}
        />
      </Modal>
    </>
  )
}
