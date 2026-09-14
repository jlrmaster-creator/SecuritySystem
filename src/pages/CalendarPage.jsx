import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useReminders } from '../context/RemindersContext'
import CalendarView from '../components/calendar/CalendarView'
import ReminderCard from '../components/reminders/ReminderCard'
import ReminderForm from '../components/reminders/ReminderForm'
import Modal from '../components/shared/Modal'
import Header from '../components/layout/Header'
import { updateReminder, deleteReminder } from '../services/remindersService'
import { isSameDayAs, formatDate } from '../utils/dateUtils'
import toast from 'react-hot-toast'
import { isToday } from 'date-fns'

export default function CalendarPage() {
  const { user } = useAuth()
  const { reminders, sentShares } = useReminders()
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [editTarget, setEditTarget] = useState(null)
  const [loading, setLoading] = useState(false)

  const dayReminders = useMemo(() =>
    reminders.filter(r => isSameDayAs(r.dateTime, selectedDay)),
    [reminders, selectedDay]
  )

  const handleEdit = async (data) => {
    setLoading(true)
    try {
      await updateReminder(editTarget.id, data)
      toast.success('Actualizado ✓')
      setEditTarget(null)
    } catch { toast.error('Error') } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    try { await deleteReminder(id); toast.success('Eliminado') }
    catch { toast.error('Error al eliminar') }
  }

  const dayLabel = isToday(selectedDay)
    ? 'Hoy'
    : formatDate(selectedDay)

  return (
    <>
      <Header title="Calendario" />

      <div className="page-content">
        <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CalendarView
            reminders={reminders}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />

          {/* Day reminders */}
          <div>
            <div className="section-header">
              <span className="section-title">
                {dayLabel} · {dayReminders.length} evento{dayReminders.length !== 1 ? 's' : ''}
              </span>
            </div>

            {dayReminders.length > 0 ? (
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dayReminders.map(r => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    onEdit={setEditTarget}
                    onDelete={handleDelete}
                    showShareBtn={false}
                    sentShares={sentShares.filter(s => s.originalReminderId === r.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <div className="empty-state-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <p className="empty-state-text">No hay eventos para este día</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar evento">
        <ReminderForm
          initial={editTarget}
          onSubmit={handleEdit}
          onCancel={() => setEditTarget(null)}
          loading={loading}
        />
      </Modal>
    </>
  )
}
