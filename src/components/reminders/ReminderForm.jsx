import { useState, useEffect } from 'react'
import { COLORS, CATEGORIES, IMPORTANCE } from '../../utils/colorUtils'
import { toInputDateTime } from '../../utils/dateUtils'
import { Timestamp } from 'firebase/firestore'

const defaultForm = {
  title: '',
  description: '',
  dateTime: '',
  importance: 'medium',
  color: '#7C3AED',
  category: 'personal',
  isPermanent: false
}

export default function ReminderForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        dateTime: initial.dateTime ? toInputDateTime(initial.dateTime) : '',
        importance: initial.importance || 'medium',
        color: initial.color || '#7C3AED',
        category: initial.category || 'personal',
        isPermanent: initial.isPermanent || false
      })
    } else {
      // Default to 1 hour from now
      const d = new Date()
      d.setHours(d.getHours() + 1, 0, 0, 0)
      const pad = n => String(n).padStart(2, '0')
      const dt = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      setForm(f => ({ ...f, dateTime: dt }))
    }
  }, [initial])

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const err = {}
    if (!form.title.trim()) err.title = 'El título es obligatorio'
    if (!form.dateTime) err.dateTime = 'La fecha es obligatoria'
    return err
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (Object.keys(err).length) { setErrors(err); return }
    
    const dateObj = new Date(form.dateTime)
    onSubmit({ ...form, dateTime: Timestamp.fromDate(dateObj) })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Title */}
      <div className="form-group">
        <label className="form-label">Título *</label>
        <input
          className={`form-input${errors.title ? ' error' : ''}`}
          placeholder="¿Qué necesitas recordar?"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          maxLength={80}
          autoFocus
        />
        {errors.title && <span className="form-error">{errors.title}</span>}
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea
          className="form-textarea"
          placeholder="Detalles opcionales..."
          value={form.description}
          onChange={e => set('description', e.target.value)}
          maxLength={300}
          rows={3}
        />
      </div>

      {/* Permanent */}
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.isPermanent}
            onChange={e => set('isPermanent', e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
          />
          <span>Permanente <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(siempre visible al inicio)</span></span>
        </label>
      </div>

      {/* Date/time */}
      <div className="form-group">
        <label className="form-label">Fecha y hora *</label>
        <input
          type="datetime-local"
          className={`form-input${errors.dateTime ? ' error' : ''}`}
          value={form.dateTime}
          onChange={e => set('dateTime', e.target.value)}
        />
        {errors.dateTime && <span className="form-error">{errors.dateTime}</span>}
      </div>

      {/* Importance */}
      <div className="form-group">
        <label className="form-label">Importancia</label>
        <div className="importance-grid">
          {IMPORTANCE.map(imp => (
            <button
              type="button"
              key={imp.id}
              className={`importance-btn${form.importance === imp.id ? ` active-${imp.id}` : ''}`}
              onClick={() => set('importance', imp.id)}
            >
              {imp.emoji} {imp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="form-group">
        <label className="form-label">Categoría</label>
        <select
          className="form-select"
          value={form.category}
          onChange={e => set('category', e.target.value)}
        >
          {CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>
          ))}
        </select>
      </div>

      {/* Color */}
      <div className="form-group">
        <label className="form-label">Color</label>
        <div className="color-picker">
          {COLORS.map(c => (
            <button
              type="button"
              key={c}
              className={`color-dot${form.color === c ? ' selected' : ''}`}
              style={{ background: c }}
              onClick={() => set('color', c)}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : null}
          {initial ? 'Guardar cambios' : 'Crear evento'}
        </button>
      </div>
    </form>
  )
}
