import { useMemo, useState } from 'react'
import { useReminders } from '../../context/RemindersContext'
import { EditIcon, DeleteIcon, ShareIcon } from '../shared/Icons'
import Modal from '../shared/Modal'
import toast from 'react-hot-toast'

export default function ReminderDetail({ reminder, onEdit, onDelete, onShare, onClose }) {
  const { sentShares } = useReminders()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const shares = useMemo(() =>
    !reminder.isShared
      ? sentShares.filter(s => s.originalReminderId === reminder.id)
      : [],
    [sentShares, reminder.id, reminder.isShared]
  )
  const handleDelete = () => setConfirmOpen(true)

  const handleDeleteConfirm = async () => {
    setConfirmOpen(false)
    onDelete()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Color + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'var(--violet)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem'
        }}>
          💬
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: 4 }}>{reminder.title}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {reminder.isShared && <span className="badge badge-shared">Recibido</span>}
          </div>
        </div>
      </div>

      {/* Description */}
      {reminder.description && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            {reminder.description}
          </p>
        </div>
      )}


      {/* Shared info (received) */}
      {reminder.isShared && (
        <div style={{ background: 'rgba(247,37,133,0.08)', border: '1px solid rgba(247,37,133,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--pink)' }}>
            📨 Enviado por <strong>{reminder.sharedFromName || 'un contacto'}</strong>
          </p>
        </div>
      )}

      {/* Shared info (sent) */}
      {shares.length > 0 && (
        <div className="card" style={{ padding: '12px 14px', marginTop: '-8px' }}>
          <div className="form-label" style={{ marginBottom: 10 }}>Historial de envíos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shares.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{s.toUserName || 'Usuario'}</span>
                <span style={{ 
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: s.status === 'accepted' ? 'rgba(6,214,160,0.1)' : 
                              s.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                  color: s.status === 'accepted' ? 'var(--teal)' : 
                         s.status === 'rejected' ? 'var(--red)' : 'var(--text-muted)' 
                }}>
                  {s.status === 'accepted' ? '✓ Aceptado' : 
                   s.status === 'rejected' ? '✗ Rechazado' : '⏳ Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {!reminder.isShared && (
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onEdit}>
              <EditIcon /> Editar
            </button>
          )}
          {onShare && (
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onShare}>
              <ShareIcon /> Compartir
            </button>
          )}
        </div>
        <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={handleDelete}>
          <DeleteIcon /> Eliminar
        </button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Eliminar mensaje">
        <p style={{ marginBottom: 20, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          ¿Estás seguro de que quieres eliminar "<strong>{reminder.title}</strong>"?
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmOpen(false)}>
            Cancelar
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDeleteConfirm}>
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  )
}
