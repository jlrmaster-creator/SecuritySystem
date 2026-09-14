import { useEffect, useState } from 'react'

const emptyForm = { title: '', description: '', groupId: '' }

export default function ReminderForm({ initial, groups = [], onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(initial
      ? { title: initial.title || '', description: initial.description || '', groupId: initial.groupId || '' }
      : emptyForm)
    setError('')
  }, [initial])

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('El título es obligatorio')
      return
    }
    onSubmit({ title: form.title.trim(), description: form.description.trim(), groupId: form.groupId })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="form-group">
        <label className="form-label">Título *</label>
        <input
          className={`form-input${error ? ' error' : ''}`}
          placeholder="Título del mensaje"
          value={form.title}
          onChange={event => { set('title', event.target.value); setError('') }}
          maxLength={80}
          autoFocus
        />
        {error && <span className="form-error">{error}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Mensaje</label>
        <textarea
          className="form-textarea"
          placeholder="Escribe el contenido del mensaje..."
          value={form.description}
          onChange={event => set('description', event.target.value)}
          maxLength={1000}
          rows={6}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Compartir con un grupo</label>
        <select className="form-select" value={form.groupId} onChange={event => set('groupId', event.target.value)}>
          <option value="">Solo para mí</option>
          {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : null}
          {initial ? 'Guardar cambios' : 'Enviar mensaje'}
        </button>
      </div>
    </form>
  )
}
