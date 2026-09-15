import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useReminders } from '../context/RemindersContext'
import { subscribeToUserGroups } from '../services/groupsService'
import { createReminder, deleteMessageThread, markThreadAsRead, replyToMessage, sendMessageToGroup, updateReminder } from '../services/remindersService'
import ReminderCard from '../components/reminders/ReminderCard'
import ReminderForm from '../components/reminders/ReminderForm'
import Modal from '../components/shared/Modal'
import Header from '../components/layout/Header'
import { PlusIcon } from '../components/shared/Icons'
import { COLORS } from '../utils/colorUtils'
import toast from 'react-hot-toast'

export default function HomePage() {
  const { user } = useAuth()
  const { reminders, sentShares, receivedShares } = useReminders()
  const [groups, setGroups] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [replyTarget, setReplyTarget] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [sentThread, setSentThread] = useState(null)
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
  }

  const handleReply = async (event) => {
    event.preventDefault()
    if (!replyTarget || !replyText.trim()) return
    const group = groups.find(item => item.id === replyTarget?.groupId)
    if (!group) {
      toast.error('El grupo de este mensaje ya no está disponible')
      return
    }
    setSendingReply(true)
    try {
      await replyToMessage(user.uid, {
        title: `Re: ${replyTarget.title}`,
        description: replyText.trim(),
        sharedFromName: user.displayName || 'Usuario'
      }, replyTarget, group)
      setReplyText('')
      setSentThread(replyTarget.threadId || replyTarget.id)
      toast.success('Respuesta enviada')
      window.setTimeout(() => setSentThread(null), 2500)
    } catch (error) {
      toast.error(error.message || 'No se pudo enviar la respuesta')
    } finally {
      setSendingReply(false)
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

  const handleDelete = async (message) => {
    try {
      await deleteMessageThread(message)
      toast.success(message.groupId ? 'Conversación eliminada' : 'Mensaje eliminado')
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar el mensaje')
    }
  }

  const getThreadColor = (threadId) => {
    const value = String(threadId || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return COLORS[value % COLORS.length]
  }

  const getThreadBackground = (color) => {
    const value = color.replace('#', '')
    const red = Number.parseInt(value.slice(0, 2), 16)
    const green = Number.parseInt(value.slice(2, 4), 16)
    const blue = Number.parseInt(value.slice(4, 6), 16)
    return `rgba(${red}, ${green}, ${blue}, 0.08)`
  }

  const getMessageTime = (message) => {
    if (!message) return 0
    const value = message.updatedAt || message.createdAt
    if (!value) return 0
    if (typeof value === 'object' && Number.isFinite(value.seconds)) {
      return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000)
    }
    return value.toMillis ? value.toMillis() : new Date(value).getTime()
  }

  const markThreadRead = async (threadId, read = true) => {
    const threadMessages = messages.filter(message => (message.threadId || message.id) === threadId)
    const latestTime = Math.max(...threadMessages.map(getMessageTime), 0)
    setReadThreads(current => {
      const next = { ...current }
      if (read) next[threadId] = Math.max(Date.now(), latestTime + 1)
      else delete next[threadId]
      localStorage.setItem(`securitysystem-read-threads-${user.uid}`, JSON.stringify(next))
      return next
    })
    try {
      await markThreadAsRead(threadMessages, read)
    } catch (error) {
      toast.error('No se pudo sincronizar el estado de lectura')
    }
  }

  const isMessageRead = (message, threadMessages = [message]) => {
    if (message.isShared) return false
    const threadId = message.threadId || message.id
    const messageIds = new Set(threadMessages.map(item => item.originalId || item.id))
    return sentShares.some(share =>
      share.readAt && (
        share.threadId === threadId ||
        messageIds.has(share.originalReminderId)
      )
    )
  }

  const renderMessage = (message, threadColor, threadBackground, threadMessages, depth = 0, onOpen) => (
    <div key={message.id} style={depth > 0 ? { marginLeft: Math.min(depth * 18, 54), borderLeft: `2px solid ${threadColor}`, paddingLeft: 10 } : undefined}>
      <ReminderCard
        reminder={message}
        onEdit={setEditTarget}
        onDelete={handleDelete}
        onReply={message.groupId ? setReplyTarget : null}
        onOpen={onOpen}
        threadColor={threadColor}
        threadBackground={threadBackground}
        isOwn={!message.isShared && message.ownerId === user.uid}
        canDelete={Boolean(message.groupId) || isOwn}
        isRead={isMessageRead(message, threadMessages)}
      />
    </div>
  )

  const renderMessages = (messages) => {
    const messageKeys = new Set(messages.map(message => message.originalId || message.id))
    const roots = messages.filter(message =>
      !message.parentId || !messageKeys.has(message.parentId)
    )
    return (
      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {roots.map(root => (
          <div key={root.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(() => {
              const threadColor = getThreadColor(root.threadId || root.id)
              const threadBackground = getThreadBackground(threadColor)
              const threadKey = root.threadId || root.id
              const threadMessages = messages.filter(message => (message.threadId || message.id) === threadKey)
              const replies = threadMessages.filter(message => message.parentId)
              const messageKey = message => message.originalId || message.id
              const children = (parentId, depth = 1) => threadMessages
                .filter(message => message.parentId === messageKey(parentId))
                .map(message => (
                  <div key={message.id}>
                    {renderMessage(message, threadColor, threadBackground, threadMessages, depth, () => markThreadRead(root.threadId || root.id))}
                    {children(message, depth + 1)}
                  </div>
                ))
              const collapsed = collapsedThreads[threadKey] === true
              const latest = [root, ...replies]
                .filter(message => message.isShared)
                .sort((a, b) => getMessageTime(b) - getMessageTime(a))[0]
              const latestTime = getMessageTime(latest)
              const messageIds = new Set(threadMessages.map(message => message.originalId || message.id))
              const remoteReadTime = receivedShares
                .filter(share => share.readAt && (
                  share.threadId === threadKey ||
                  messageIds.has(share.originalReminderId)
                ))
                .reduce((latestRead, share) => Math.max(latestRead, getMessageTime({ updatedAt: share.readAt })), 0)
              const unread = Boolean(latest) && latestTime > Math.max(
                readThreads[threadKey] || 0,
                remoteReadTime
              )
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, padding: '8px 10px 4px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: threadColor, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {replies.length} {replies.length === 1 ? 'respuesta' : 'respuestas'} · Último: {latest ? (latest.sharedFromName || (latest.isShared ? 'Miembro del grupo' : 'Tú')) : 'Tú'}
                      {latestTime > 0 && ` · ${new Date(latestTime).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                    {unread && <span className="badge" style={{ background: 'var(--teal-glow)', color: 'var(--teal-light)' }}>Nuevo</span>}
                  </div>
                  <div style={{
                    background: threadBackground,
                    border: `1px solid ${threadColor}33`,
                    borderRadius: 'var(--radius-lg)',
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    {renderMessage(root, threadColor, threadBackground, threadMessages, 0, () => markThreadRead(root.threadId || root.id))}
                  {replies.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ alignSelf: 'flex-start', marginLeft: 18 }}
                      onClick={() => setCollapsedThreads(current => ({ ...current, [threadKey]: !collapsed }))}
                    >
                      {collapsed ? `Mostrar respuestas (${replies.length})` : `Ocultar respuestas (${replies.length})`}
                    </button>
                  )}
                  {!collapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {children(root)}
                    </div>
                  )}
                  {replyTarget && (replyTarget.threadId || replyTarget.id) === threadKey && (
                    <form onSubmit={handleReply} style={{ marginLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Respondiendo a <strong>{replyTarget.title}</strong>
                      </div>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        placeholder="Escribe tu respuesta..."
                        value={replyText}
                        onChange={event => setReplyText(event.target.value)}
                        disabled={sendingReply}
                        autoFocus
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {sentThread === (root.threadId || root.id) && (
                          <span style={{ color: 'var(--teal-light)', fontSize: '0.8rem' }}>✓ Enviado</span>
                        )}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setReplyTarget(null); setReplyText('') }}>Cancelar</button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={sendingReply || !replyText.trim()}>
                          {sendingReply ? 'Enviando...' : 'Enviar respuesta'}
                        </button>
                      </div>
                    </form>
                  )}
                  </div>
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
      <Modal open={formOpen || !!editTarget} onClose={closeForm} title={editTarget ? 'Editar mensaje' : 'Nuevo mensaje'}>
        <ReminderForm
          initial={editTarget}
          groups={groups}
          onSubmit={editTarget ? handleEdit : handleSubmit}
          onCancel={closeForm}
          loading={loading}
        />
      </Modal>
    </>
  )
}
