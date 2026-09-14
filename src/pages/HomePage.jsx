import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useReminders } from '../context/RemindersContext'
import {
  createReminder, updateReminder, deleteReminder
} from '../services/remindersService'
import ReminderCard from '../components/reminders/ReminderCard'
import ReminderForm from '../components/reminders/ReminderForm'
import VoiceModal from '../components/reminders/VoiceModal'
import Modal from '../components/shared/Modal'
import Header from '../components/layout/Header'
import ShareModal from '../components/reminders/ShareModal'
import { PlusIcon, SearchIcon } from '../components/shared/Icons'
import toast from 'react-hot-toast'
import { CATEGORIES, IMPORTANCE } from '../utils/colorUtils'

export default function HomePage() {
  const { user } = useAuth()
  const { reminders, sentShares } = useReminders()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [shareTarget, setShareTarget] = useState(null)
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [voicePrefill, setVoicePrefill] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterImportance, setFilterImportance] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPermanent, setFilterPermanent] = useState('all')

  const handleCreate = async (data) => {
    setLoading(true)
    try {
      await createReminder(user.uid, data)
      toast.success('Mensaje creado ✓')
      setFormOpen(false)
      setVoicePrefill(null)
    } catch { toast.error('Error al crear') } finally { setLoading(false) }
  }

  const handleEdit = async (data) => {
    setLoading(true)
    try {
      await updateReminder(editTarget.id, data)
      toast.success('Actualizado ✓')
      setEditTarget(null)
    } catch { toast.error('Error al actualizar') } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    try {
      await deleteReminder(id)
      toast.success('Eliminado')
    } catch { toast.error('Error al eliminar') }
  }

  const handleVoiceResult = (data) => {
    if (data) {
      setVoicePrefill(data)
      setEditTarget(null)
      setFormOpen(true)
    }
  }

  const filtered = useMemo(() => reminders.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase())
    const matchImp = filterImportance === 'all' || r.importance === filterImportance
    const matchCat = filterCategory === 'all' || r.category === filterCategory
    const matchPerm = filterPermanent === 'all' || r.isPermanent === true
    return matchSearch && matchImp && matchCat && matchPerm
  }), [reminders, search, filterImportance, filterCategory, filterPermanent])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (a.isPermanent && !b.isPermanent) return -1
    if (!a.isPermanent && b.isPermanent) return 1
    const ta = a.dateTime?.toDate?.() || new Date(a.dateTime || 0)
    const tb = b.dateTime?.toDate?.() || new Date(b.dateTime || 0)
    return ta - tb
  }), [filtered])

  const ownReminders = useMemo(() => sorted.filter(r => !r.isShared), [sorted])
  const sharedAccepted = useMemo(() => sorted.filter(r => r.isShared && r.status === 'accepted'), [sorted])

  return (
    <>
      <Header
        title="Mis mensajes"
        right={
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="header-action" onClick={() => { setEditTarget(null); setFormOpen(true); setVoicePrefill(null) }}>
              <PlusIcon />
            </button>
            <button className="header-action" onClick={() => setVoiceModalOpen(true)} title="Crear por voz">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8"/>
              </svg>
            </button>
          </div>
        }
      />

      <div className="page-content">
        <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Search */}
          <div className="search-bar">
            <span className="search-icon"><SearchIcon /></span>
            <input
              className="search-input"
              placeholder="Buscar mensajes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="filter-bar">
              <button className={`filter-chip${filterImportance === 'all' ? ' active' : ''}`} onClick={() => setFilterImportance('all')}>Todos</button>
              {IMPORTANCE.map(i => (
                <button key={i.id} className={`filter-chip${filterImportance === i.id ? ' active' : ''}`} onClick={() => setFilterImportance(i.id)}>
                  {i.emoji} {i.label}
                </button>
              ))}
              <button className={`filter-chip${filterPermanent === 'permanent' ? ' active' : ''}`} onClick={() => setFilterPermanent(filterPermanent === 'permanent' ? 'all' : 'permanent')}>
                ♾️ Permanentes
              </button>
            </div>
            <div className="filter-bar">
              <button className={`filter-chip${filterCategory === 'all' ? ' active' : ''}`} onClick={() => setFilterCategory('all')}>Todas</button>
              {CATEGORIES.map(c => (
                <button key={c.id} className={`filter-chip${filterCategory === c.id ? ' active' : ''}`} onClick={() => setFilterCategory(c.id)}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Own reminders */}
          {ownReminders.length > 0 && (
            <div>
              <div className="section-header"><span className="section-title">📌 Mis mensajes</span></div>
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ownReminders.map(r => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    onEdit={setEditTarget}
                    onDelete={handleDelete}
                    onShare={setShareTarget}
                    showShareBtn
                    sentShares={sentShares.filter(s => s.originalReminderId === r.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Shared accepted */}
          {sharedAccepted.length > 0 && (
            <div>
              <div className="section-header"><span className="section-title">📨 Recibidos</span></div>
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sharedAccepted.map(r => (
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
            </div>
          )}

          {/* Empty */}
          {sorted.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="2"/>
                </svg>
              </div>
              <div className="empty-state-title">Sin mensajes</div>
              <p className="empty-state-text">Toca el botón + para crear tu primer mensaje</p>
              <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
                <PlusIcon /> Crear mensaje
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FABs */}
      <div style={{ position: 'fixed', bottom: 'calc(var(--nav-height) + 20px)', right: 24, display: 'flex', gap: 12, zIndex: 100 }}>
        <button className="fab" onClick={() => setVoiceModalOpen(true)}
          title="Crear por voz"
          style={{ position: 'static', background: 'linear-gradient(135deg, var(--teal), #0D9488)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8"/>
          </svg>
        </button>
        <button className="fab" onClick={() => { setEditTarget(null); setFormOpen(true); setVoicePrefill(null) }}
          style={{ position: 'static' }}
        >
          <PlusIcon />
        </button>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={formOpen || !!editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null); setVoicePrefill(null) }}
        title={editTarget ? 'Editar mensaje' : 'Nuevo mensaje'}
      >
        <ReminderForm
          initial={editTarget || voicePrefill}
          onSubmit={editTarget ? handleEdit : handleCreate}
          onCancel={() => { setFormOpen(false); setEditTarget(null); setVoicePrefill(null) }}
          loading={loading}
        />
      </Modal>

      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          reminder={shareTarget}
          onClose={() => setShareTarget(null)}
          userId={user.uid}
          userDisplayName={user.displayName}
        />
      )}

      {/* Voice Modal */}
      <VoiceModal
        open={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onResult={handleVoiceResult}
      />
    </>
  )
}
