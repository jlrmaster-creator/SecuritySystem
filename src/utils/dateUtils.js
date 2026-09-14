// Utility functions for dates
import { format, isToday, isTomorrow, isYesterday, parseISO, startOfDay, endOfDay, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'
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

export const formatMonthYear = (date) => format(date, "MMMM yyyy", { locale: es })

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

export const isSameDayAs = (dateTime, day) => {
  if (!dateTime) return false
  const date = dateTime?.toDate ? dateTime.toDate() : new Date(dateTime)
  return isSameDay(date, day)
}

export const getCalendarDays = (currentDate) => {
  const start = startOfMonth(currentDate)
  const end = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start, end })

  // Pad start: Monday = 0
  const startDay = (getDay(start) + 6) % 7
  const padStart = Array.from({ length: startDay }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() - (startDay - i))
    return { date: d, isCurrentMonth: false }
  })

  // Pad end to complete 6 rows
  const totalCells = Math.ceil((startDay + days.length) / 7) * 7
  const endPad = totalCells - startDay - days.length
  const padEnd = Array.from({ length: endPad }, (_, i) => {
    const d = new Date(end)
    d.setDate(d.getDate() + i + 1)
    return { date: d, isCurrentMonth: false }
  })

  return [
    ...padStart,
    ...days.map(date => ({ date, isCurrentMonth: true })),
    ...padEnd
  ]
}

export const prevMonth = (date) => subMonths(date, 1)
export const nextMonth = (date) => addMonths(date, 1)
