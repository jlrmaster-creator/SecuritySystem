export const COLORS = [
  '#0891B2', '#22D3EE', '#F59E0B', '#FB7185',
  '#FB8500', '#FFB703', '#3A86FF', '#FF6B6B',
  '#4ECDC4', '#A8DADC', '#E63946', '#F4A261'
]

export const CATEGORIES = [
  { id: 'work', label: 'Trabajo', emoji: '💼' },
  { id: 'personal', label: 'Personal', emoji: '🏠' },
  { id: 'urgent', label: 'Urgente', emoji: '🔥' },
  { id: 'health', label: 'Salud', emoji: '🏥' },
  { id: 'study', label: 'Estudio', emoji: '📚' },
  { id: 'finance', label: 'Finanzas', emoji: '💰' },
  { id: 'social', label: 'Social', emoji: '👥' },
  { id: 'other', label: 'Otro', emoji: '📌' }
]

export const IMPORTANCE = [
  { id: 'low', label: 'Baja', emoji: '🟢' },
  { id: 'medium', label: 'Media', emoji: '🟡' },
  { id: 'high', label: 'Alta', emoji: '🔴' }
]

export const getCategoryById = (id) =>
  CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

export const getImportanceById = (id) =>
  IMPORTANCE.find(i => i.id === id) || IMPORTANCE[0]

export const importanceBadgeClass = (importance) => {
  if (importance === 'high') return 'badge badge-high'
  if (importance === 'medium') return 'badge badge-medium'
  return 'badge badge-low'
}
