import { useState } from 'react'
import { formatDateTime, isOverdue } from '../../utils/dateUtils'
import { getCategoryById, getImportanceById, importanceBadgeClass } from '../../utils/colorUtils'
import { ClockIcon } from '../shared/Icons'
import Modal from '../shared/Modal'
import ReminderDetail from './ReminderDetail'

export default function ReminderCard({ reminder, onEdit, onDelete, onShare, showShareBtn, sentShares = [] }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const cat = getCategoryById(reminder.category)
  const imp = getImportanceById(reminder.importance)
  const overdue = isOverdue(reminder.dateTime) && reminder.status !== 'completed'
  const color = reminder.color || '#7C3AED'

  return (
    <>
      <div
        className="card clickable reminder-card anim-slide-up"
        onClick={() => setDetailOpen(true)}
        style={{ paddingLeft: '20px' }}
      >
        {/* Accent bar */}
        <div className="reminder-card-accent" style={{ background: color }} />

        <div className="reminder-card-inner">
          <div className="reminder-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              {reminder.isPermanent && (
                <div className="permanent-badge" style={{ marginBottom: 2 }}>♾️ Permanente</div>
              )}
              {reminder.calendarEventId && (
                <div className="permanent-badge" style={{ marginBottom: 2, color: '#4285F4' }}>📅 Calendar</div>
              )}
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
              {/* Sent shares status (for owners) */}
              {!reminder.isShared && sentShares && sentShares.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                  {(() => {
                    const accepted = sentShares.filter(s => s.status === 'accepted').length
                    const rejected = sentShares.filter(s => s.status === 'rejected').length
                    const pending = sentShares.filter(s => s.status === 'pending').length
                    return (
                      <>
                        {accepted > 0 && <span className="badge" style={{ background: 'rgba(6,214,160,0.08)', color: 'var(--teal)' }}>✓ {accepted}</span>}
                        {rejected > 0 && <span className="badge" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--red)' }}>✗ {rejected}</span>}
                        {pending > 0 && <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}>⏳ {pending}</span>}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
            <span className={importanceBadgeClass(reminder.importance)} style={{ flexShrink: 0 }}>
              {imp.emoji}
            </span>
          </div>

          <div className="reminder-meta">
            <span className="reminder-date" style={{ color: overdue ? 'var(--red)' : 'var(--text-muted)' }}>
              <ClockIcon />
              {formatDateTime(reminder.dateTime)}
              {overdue && ' · Vencido'}
            </span>
            {cat && (
              <span className="badge badge-category">
                {cat.emoji} {cat.label}
              </span>
            )}
          </div>
        </div>
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)}>
        <ReminderDetail
          reminder={reminder}
          onEdit={() => { setDetailOpen(false); onEdit(reminder) }}
          onDelete={() => { setDetailOpen(false); onDelete(reminder.id) }}
          onShare={showShareBtn ? () => { setDetailOpen(false); onShare(reminder) } : null}
          onClose={() => setDetailOpen(false)}
        />
      </Modal>
    </>
  )
}
