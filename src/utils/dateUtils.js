// Utility functions for dates
import { format, isToday, isTomorrow, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'

export const formatDateTime = (dateTime) => {
  if (!dateTime) return ''
  const date = dateTime?.toDate ? dateTime.toDate() : new Date(dateTime)
  if (isToday(date)) return `Hoy, ${format(date, 'HH:mm')}`
  if (isTomorrow(date)) return `Mañana, ${format(date, 'HH:mm')}`
  if (isYesterday(date)) return `Ayer, ${format(date, 'HH:mm')}`
  return format(date, "d MMM, HH:mm", { locale: es })
}

export const formatDate = (dateTime) => {
  if (!dateTime) return ''
  const date = dateTime?.toDate ? dateTime.toDate() : new Date(dateTime)
  return format(date, "d 'de' MMMM yyyy", { locale: es })
}

export const formatTime = (dateTime) => {
  if (!dateTime) return ''
  const date = dateTime?.toDate ? dateTime.toDate() : new Date(dateTime)
  return format(date, 'HH:mm')
}

export const toInputDateTime = (dateTime) => {
  if (!dateTime) return ''
  const date = dateTime?.toDate ? dateTime.toDate() : new Date(dateTime)
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export const isOverdue = (dateTime) => {
  if (!dateTime) return false
  const date = dateTime?.toDate ? dateTime.toDate() : new Date(dateTime)
  return date < new Date()
}
