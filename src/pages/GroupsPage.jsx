import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  subscribeToUserGroups, createGroup, requestToJoinGroup,
  leaveGroup, getGroupMembers, createGroupInvitation,
  approveGroupRequest, rejectGroupRequest
} from '../services/groupsService'
import { subscribeToMyReminders, shareReminder } from '../services/remindersService'
import Header from '../components/layout/Header'
import Modal from '../components/shared/Modal'
import GroupForm from '../components/groups/GroupForm'
import MemberList from '../components/groups/MemberList'
import { PlusIcon } from '../components/shared/Icons'
import toast from 'react-hot-toast'

export default function GroupsPage() {
  const { user, profile } = useAuth()
  const [groups, setGroups] = useState([])
  const [reminders, setReminders] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [pendingMembers, setPendingMembers] = useState([])
  const [shareModal, setShareModal] = useState(null) // { member, group }
  const [loading, setLoading] = useState(false)
  const [shareReminderId, setShareReminderId] = useState('')
  const [inviteToken, setInviteToken] = useState('')

  useEffect(() => {
    if (!user) return
    const unsub1 = subscribeToUserGroups(user.uid, setGroups)
    const unsub2 = subscribeToMyReminders(user.uid, setReminders)
    return () => { unsub1(); unsub2() }
  }, [user])

  useEffect(() => {
    if (!selectedGroup) return
    getGroupMembers(selectedGroup.members).then(setGroupMembers)
    getGroupMembers(selectedGroup.pendingMembers || []).then(setPendingMembers)
  }, [selectedGroup])

  const handleCreate = async (name, desc) => {
    setLoading(true)
    try {
      const { inviteToken } = await createGroup(user.uid, name, desc)
      await navigator.clipboard.writeText(inviteToken)
      toast.success('Grupo creado. Token privado copiado')
      setFormOpen(false)
    } catch { toast.error('Error al crear') } finally { setLoading(false) }
  }

  const handleJoin = async (code) => {
    setLoading(true)
    try {
      await requestToJoinGroup(user.uid, code)
      toast.success('Solicitud enviada. El administrador debe aprobarla')
      setFormOpen(false)
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  const handleLeave = async (group) => {
    if (!window.confirm(`¿Salir del grupo "${group.name}"?`)) return
    try {
      await leaveGroup(user.uid, group.id)
      setSelectedGroup(null)
      toast.success('Has salido del grupo')
    } catch { toast.error('Error') }
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => toast.success('Código copiado 📋'))
  }

  const handleCreateInvite = async () => {
    try {
      const { inviteToken: token } = await createGroupInvitation(selectedGroup.id, user.uid)
      await navigator.clipboard.writeText(token)
      setInviteToken(token)
      toast.success('Token privado copiado')
    } catch (err) { toast.error(err.message || 'No se pudo crear la invitación') }
  }

  const handleApprove = async (memberId) => {
    try {
      await approveGroupRequest(selectedGroup.id, memberId)
      setSelectedGroup(group => ({ ...group, members: [...(group.members || []), memberId], pendingMembers: (group.pendingMembers || []).filter(id => id !== memberId) }))
      toast.success('Solicitud aprobada')
    } catch (err) { toast.error(err.message || 'No se pudo aprobar la solicitud') }
  }

  const handleReject = async (memberId) => {
    try {
      await rejectGroupRequest(selectedGroup.id, memberId)
      setSelectedGroup(group => ({ ...group, pendingMembers: (group.pendingMembers || []).filter(id => id !== memberId) }))
      toast.success('Solicitud rechazada')
    } catch (err) { toast.error(err.message || 'No se pudo rechazar la solicitud') }
  }

  const handleShareToMember = (member) => {
    setShareModal({ member, group: selectedGroup })
    setShareReminderId('')
  }

  const handleDoShare = async () => {
    if (!shareReminderId) { toast.error('Selecciona un mensaje'); return }
    const reminder = reminders.find(r => r.id === shareReminderId)
    if (!reminder) return
    try {
      await shareReminder(
        { ...reminder, sharedFromName: profile?.displayName || user.displayName || 'Tú' },
        user.uid,
        shareModal.member.id,
        shareModal.group.id
      )
      toast.success(`Enviado a ${shareModal.member.displayName} ✓`)
      setShareModal(null)
    } catch { toast.error('Error al compartir') }
  }

  return (
    <>
      <Header
        title="Mis Grupos"
        right={
          <button className="header-action" onClick={() => setFormOpen(true)}>
            <PlusIcon />
          </button>
        }
      />

      <div className="page-content">
        <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {groups.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <div className="empty-state-title">Sin grupos</div>
              <p className="empty-state-text">Crea un grupo o únete con un código de invitación</p>
              <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
                <PlusIcon /> Crear o unirse
              </button>
            </div>
          ) : (
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {groups.map(g => (
                <div
                  key={g.id}
                  className="card clickable"
                  onClick={() => setSelectedGroup(g)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14 }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'linear-gradient(135deg, var(--violet), var(--violet-dark))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem', flexShrink: 0
                  }}>👥</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }} className="truncate">{g.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {g.members?.length || 0} miembro{g.members?.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Join Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Grupos">
        <GroupForm onSubmit={handleCreate} onJoin={handleJoin} onCancel={() => setFormOpen(false)} loading={loading} />
      </Modal>

      {/* Group Detail Modal */}
      <Modal open={!!selectedGroup} onClose={() => setSelectedGroup(null)} title={selectedGroup?.name}>
        {selectedGroup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {selectedGroup.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedGroup.description}</p>
            )}

            {/* Invite code */}
            <div>
              <div className="form-label" style={{ marginBottom: 8 }}>Invitación privada</div>
              <button className="btn btn-primary btn-full" onClick={handleCreateInvite}>
                Generar token de un solo uso
              </button>
              {inviteToken && <div className="invite-code-display" onClick={() => handleCopyCode(inviteToken)}>
                {inviteToken}
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, letterSpacing: 0 }}>
                  Las invitaciones son de un solo uso y caducan
                </div>
              </div>}
            </div>

            {user.uid === selectedGroup.createdBy && pendingMembers.length > 0 && (
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>Solicitudes pendientes · {pendingMembers.length}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingMembers.map(member => (
                    <div key={member.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10 }}>
                      <span style={{ flex: 1 }}>{member.displayName || member.email}</span>
                      <button className="btn btn-teal btn-sm" onClick={() => handleApprove(member.id)}>Aprobar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleReject(member.id)}>Rechazar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            <div>
              <div className="form-label" style={{ marginBottom: 8 }}>
                Miembros · {groupMembers.length}
              </div>
              <MemberList
                members={groupMembers}
                currentUserId={user.uid}
                onShareToMember={handleShareToMember}
              />
            </div>

            <button className="btn btn-danger" onClick={() => handleLeave(selectedGroup)}>
              Salir del grupo
            </button>
          </div>
        )}
      </Modal>

      {/* Share reminder to member Modal */}
      <Modal open={!!shareModal} onClose={() => setShareModal(null)} title={`Compartir con ${shareModal?.member?.displayName}`}>
        {shareModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Selecciona un mensaje</label>
              <select
                className="form-select"
                value={shareReminderId}
                onChange={e => setShareReminderId(e.target.value)}
              >
                <option value="">-- Elige un mensaje --</option>
                {reminders.filter(r => !r.isShared).map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShareModal(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleDoShare}>
                Enviar mensaje
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
