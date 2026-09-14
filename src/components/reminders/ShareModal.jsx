import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { subscribeToUserGroups, getGroupMembers } from '../../services/groupsService'
import { shareReminder } from '../../services/remindersService'
import Modal from '../shared/Modal'
import toast from 'react-hot-toast'

export default function ShareModal({ reminder, onClose, userId, userDisplayName }) {
  const { profile } = useAuth()
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [members, setMembers] = useState([])
  const [selectedMemberIds, setSelectedMemberIds] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    return subscribeToUserGroups(userId, setGroups)
  }, [userId])

  useEffect(() => {
    if (!selectedGroupId) { setMembers([]); setSelectedMemberIds([]); return }
    const group = groups.find(g => g.id === selectedGroupId)
    if (!group) return
    getGroupMembers(group.members).then(m => {
      setMembers(m.filter(mem => mem.id !== userId))
    })
  }, [selectedGroupId, groups, userId])

  const toggleMember = (id) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedMemberIds(members.map(m => m.id))
  }

  const deselectAll = () => {
    setSelectedMemberIds([])
  }

  const handleShare = async () => {
    if (!selectedGroupId) { toast.error('Selecciona un grupo'); return }
    if (selectedMemberIds.length === 0) { toast.error('Selecciona al menos un destinatario'); return }
    setLoading(true)
    try {
      const baseReminder = { ...reminder, sharedFromName: profile?.displayName || userDisplayName || 'Tú' }
      const selectedMembers = members.filter(m => selectedMemberIds.includes(m.id))
      await Promise.all(selectedMembers.map(m =>
        shareReminder(baseReminder, userId, m.id, selectedGroupId, m.displayName)
      ))
      toast.success(`Enviado a ${selectedMembers.length} miembro${selectedMembers.length !== 1 ? 's' : ''} ✓`)
      onClose()
    } catch (err) {
      toast.error('Error al compartir')
    } finally {
      setLoading(false)
    }
  }

  const allSelected = members.length > 0 && selectedMemberIds.length === members.length

  return (
    <Modal open onClose={onClose} title={`Compartir "${reminder?.title}"`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="form-group">
          <label className="form-label">Selecciona un grupo</label>
          <select
            className="form-select"
            value={selectedGroupId}
            onChange={e => { setSelectedGroupId(e.target.value); setSelectedMemberIds([]) }}
          >
            <option value="">-- Elige un grupo --</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.members?.length || 0} miembros)</option>
            ))}
          </select>
          {groups.length === 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No perteneces a ningún grupo. Crea o únete a uno primero.
            </span>
          )}
        </div>

        {members.length > 0 && (
          <div className="form-group">
            <label className="form-label">Enviar a ({selectedMemberIds.length} seleccionados)</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                onClick={allSelected ? deselectAll : selectAll}
              >
                {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => {
                const isSelected = selectedMemberIds.includes(m.id)
                return (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isSelected ? 'var(--violet)' : 'var(--border-glass)'}`,
                      background: isSelected ? 'var(--violet-glow)' : 'var(--bg-card)',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleMember(m.id)}
                      style={{
                        width: 18, height: 18, accentColor: 'var(--violet)',
                        cursor: 'pointer', flexShrink: 0
                      }}
                    />
                    <div className="avatar" style={{ width: 36, height: 36 }}>
                      {m.photoURL
                        ? <img src={m.photoURL} alt={m.displayName} />
                        : (m.displayName?.[0] || '?').toUpperCase()
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{m.displayName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {selectedGroupId && members.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '12px 0' }}>
            No hay otros miembros en este grupo
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleShare}
            disabled={loading || selectedMemberIds.length === 0}
          >
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : null}
            {loading
              ? 'Compartiendo...'
              : `Compartir con ${selectedMemberIds.length} miembro${selectedMemberIds.length !== 1 ? 's' : ''}`
            }
          </button>
        </div>
      </div>
    </Modal>
  )
}
