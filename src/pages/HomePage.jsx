import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useReminders } from '../context/RemindersContext'
import { subscribeToUserGroups } from '../services/groupsService'
import { createReminder, deleteReminder, sendMessageToGroup, updateReminder } from '../services/remindersService'
import ReminderCard from '../components/reminders/ReminderCard'
import ReminderForm from '../components/reminders/ReminderForm'
import Modal from '../components/shared/Modal'
import Header from '../components/layout/Header'
import { PlusIcon } from '../components/shared/Icons'
import toast from 'react-hot-toast'

export default function HomePage() {
  const { user } = useAuth()
  const { reminders } = useReminders()
  const [groups, setGroups] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    return subscribeToUserGroups(user.uid, setGroups)
  }, [user])

  const ownMessages = useMemo(() => reminders.filter(message => !message.isShared), [reminders])
  const receivedMessages = useMemo(
    () => reminders.filter(message => message.isShared && message.status === 'accepted'),
    [reminders]
  )

  const closeForm = () => {
    setFormOpen(false)
    setEditTarget(null)
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

  const renderMessages = (messages) => (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {messages.map(message => (
        <ReminderCard key={message.id} reminder={message} onEdit={setEditTarget} onDelete={handleDelete} />
      ))}
    </div>
  )

  return (
    <>
      <Header
        title="Mensajes"
        right={<button className="header-action" onClick={() => setFormOpen(true)}><PlusIcon /></button>}
      />
      <div className="page-content">
        <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {ownMessages.length > 0 && (
            <section>
              <div className="section-header"><span className="section-title">Mis mensajes</span></div>
              {renderMessages(ownMessages)}
            </section>
          )}
          {receivedMessages.length > 0 && (
            <section>
              <div className="section-header"><span className="section-title">Recibidos</span></div>
              {renderMessages(receivedMessages)}
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
