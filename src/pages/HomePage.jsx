import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useReminders } from '../context/RemindersContext'
import { subscribeToUserGroups } from '../services/groupsService'
import { createReminder, deleteReminder, replyToMessage, sendMessageToGroup, updateReminder } from '../services/remindersService'
import ReminderCard from '../components/reminders/ReminderCard'
import ReminderForm from '../components/reminders/ReminderForm'
import Modal from '../components/shared/Modal'
import Header from '../components/layout/Header'
import { PlusIcon } from '../components/shared/Icons'
import { COLORS } from '../utils/colorUtils'
import toast from 'react-hot-toast'

export default function HomePage() {
  const { user } = useAuth()
  const { reminders } = useReminders()
  const [groups, setGroups] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [replyTarget, setReplyTarget] = useState(null)
  const [loading, setLoading] = useState(false)
  const [collapsedThreads, setCollapsedThreads] = useState({})
  const [readThreads, setReadThreads] = useState({})

  useEffect(() => {
    if (!user) return
    return subscribeToUserGroups(user.uid, setGroups)
  }, [user])

  useEffect(() => {
    if (!user) return
    try {
      setReadThreads(JSON.parse(localStorage.getItem(`securitysystem-read-threads-${user.uid}`) || '{}'))
    } catch {
      setReadThreads({})
    }
  }, [user])

  const messages = useMemo(
    () => reminders.filter(message => !message.isShared || message.status === 'accepted'),
    [reminders]
  )

  const closeForm = () => {
    setFormOpen(false)
    setEditTarget(null)
    setReplyTarget(null)
  }

  const handleReply = async (data) => {
    const group = groups.find(item => item.id === replyTarget?.groupId)
    if (!group) {
      toast.error('El grupo de este mensaje ya no está disponible')
      return
    }
    setLoading(true)
    try {
      await replyToMessage(user.uid, data, replyTarget, group)
      toast.success('Respuesta enviada')
      closeForm()
    } catch (error) {
      toast.error(error.message || 'No se pudo enviar la respuesta')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data) => {
    setLoading(true)
    try {
      const group = groups.find(item => item.id === data.groupId)
      if (group) {
        await sendMessageToGroup(user.uid, { ...data, sharedFromName: user.displayName || 'Usuario' }, group)
        toast.success('Mensaje enviado al grupo')
      } else {
        await createReminder(user.uid, data)
        toast.success('Mensaje guardado')
      }
      closeForm()
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar el mensaje')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (data) => {
    setLoading(true)
    try {
      await updateReminder(editTarget.id, { title: data.title, description: data.description })
      toast.success('Mensaje actualizado')
      closeForm()
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar el mensaje')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteReminder(id)
      toast.success('Mensaje eliminado')
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar el mensaje')
    }
  }

  const getThreadColor = (threadId) => {
    const value = String(threadId || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return COLORS[value % COLORS.length]
  }

  const getMessageTime = (message) => {
    const value = message.updatedAt || message.createdAt
    if (!value) return 0
    return value.toMillis ? value.toMillis() : new Date(value).getTime()
  }

  const markThreadRead = (threadId, read = true) => {
    setReadThreads(current => {
      const next = { ...current }
      if (read) next[threadId] = Date.now()
      else delete next[threadId]
      localStorage.setItem(`securitysystem-read-threads-${user.uid}`, JSON.stringify(next))
      return next
    })
  }

  const renderMessage = (message, threadColor, nested = false, onOpen) => (
    <div key={message.id} style={nested ? { marginLeft: 18, borderLeft: `2px solid ${threadColor}`, paddingLeft: 10 } : undefined}>
      <ReminderCard
        reminder={message}
        onEdit={setEditTarget}
        onDelete={handleDelete}
        onReply={message.groupId ? setReplyTarget : null}
        onOpen={onOpen}
        threadColor={threadColor}
      />
    </div>
  )

  const renderMessages = (messages) => {
    const roots = messages.filter(message => !message.parentId)
    return (
      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {roots.map(root => (
          <div key={root.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(() => {
              const threadColor = getThreadColor(root.threadId || root.id)
              const replies = messages.filter(message => message.threadId === root.threadId && message.parentId)
              const collapsed = collapsedThreads[root.id]
              const latest = [root, ...replies].sort((a, b) => getMessageTime(b) - getMessageTime(a))[0]
              const latestTime = getMessageTime(latest)
              const unread = latestTime > (readThreads[root.threadId || root.id] || 0)
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, paddingLeft: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: threadColor, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {replies.length} {replies.length === 1 ? 'respuesta' : 'respuestas'} · Último: {latest.sharedFromName || (latest.isShared ? 'Miembro del grupo' : 'Tú')}
                      {latestTime > 0 && ` · ${new Date(latestTime).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                    {unread && <span className="badge" style={{ background: 'var(--teal-glow)', color: 'var(--teal-light)' }}>Nuevo</span>}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => markThreadRead(root.threadId || root.id, !unread)}
                    >
                      {unread ? 'Marcar leído' : 'Marcar no leído'}
                    </button>
                  </div>
                  {renderMessage(root, threadColor, false, () => markThreadRead(root.threadId || root.id))}
                  {replies.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ alignSelf: 'flex-start', marginLeft: 18 }}
                      onClick={() => setCollapsedThreads(current => ({ ...current, [root.id]: !current[root.id] }))}
                    >
                      {collapsed ? `Mostrar respuestas (${replies.length})` : `Ocultar respuestas (${replies.length})`}
                    </button>
                  )}
                  {!collapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {replies.map(message => renderMessage(message, threadColor, true, () => markThreadRead(root.threadId || root.id)))}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <Header
        title="Mensajes"
        right={<button className="header-action" onClick={() => setFormOpen(true)}><PlusIcon /></button>}
      />
      <div className="page-content">
        <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.length > 0 && (
            <section>
              <div className="section-header"><span className="section-title">Conversaciones</span></div>
              {renderMessages(messages)}
            </section>
          )}
          {reminders.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-title">Sin mensajes</div>
              <p className="empty-state-text">Crea un mensaje y compártelo con uno de tus grupos.</p>
              <button className="btn btn-primary" onClick={() => setFormOpen(true)}><PlusIcon /> Crear mensaje</button>
            </div>
          )}
        </div>
      </div>
      <Modal open={formOpen || !!editTarget || !!replyTarget} onClose={closeForm} title={editTarget ? 'Editar mensaje' : replyTarget ? 'Responder al mensaje' : 'Nuevo mensaje'}>
        <ReminderForm
          initial={editTarget}
          replyTo={replyTarget}
          groups={groups}
          onSubmit={editTarget ? handleEdit : replyTarget ? handleReply : handleSubmit}
          onCancel={closeForm}
          loading={loading}
        />
      </Modal>
    </>
  )
}
