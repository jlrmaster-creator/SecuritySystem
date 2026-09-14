const DAYS = { lunes: 1, martes: 2, miércoles: 3, jueves: 4, viernes: 5, sábado: 6, domingo: 7 }
const MONTHS = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 }

const nextDay = (dayIndex) => {
  const now = new Date()
  const current = now.getDay() || 7
  const diff = dayIndex - current
  const d = new Date(now)
  d.setDate(d.getDate() + (diff <= 0 ? diff + 7 : diff))
  d.setHours(0, 0, 0, 0)
  return d
}

const parseRelative = (text) => {
  const re = /en\s+(\d+)\s*(minuto|minutos|hora|horas|día|días|semana|semanas)/i
  const m = text.match(re)
  if (!m) return null
  const num = parseInt(m[1])
  const unit = m[2].toLowerCase()
  const now = new Date()
  if (unit.startsWith('minuto')) now.setMinutes(now.getMinutes() + num)
  else if (unit.startsWith('hora')) now.setHours(now.getHours() + num)
  else if (unit.startsWith('día')) now.setDate(now.getDate() + num)
  else if (unit.startsWith('semana')) now.setDate(now.getDate() + num * 7)
  return now
}

const parseTime = (text) => {
  let hour = null, minute = 0
  const timeRe = /a\s+las\s+(\d+)(?:\s*(?:\:|y\s*)?(\d+))?/i
  const tm = text.match(timeRe)
  if (tm) {
    hour = parseInt(tm[1])
    minute = parseInt(tm[2]) || 0
  }
  const meridiem = text.match(/(de\s+la\s+)?(mañana|tarde|noche)/i)
  if (meridiem) {
    const period = meridiem[2].toLowerCase()
    if (period === 'tarde' || period === 'noche') {
      if (hour !== null && hour < 12) hour += 12
    } else if (period === 'mañana') {
      if (hour !== null && hour >= 12) hour = hour % 12
    }
  }
  if (hour === null && minute === 0) return null
  return { hour: hour || 0, minute }
}

const parseDate = (text) => {
  // "pasado mañana"
  if (/pasado\s+mañana/i.test(text)) {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    d.setHours(0, 0, 0, 0)
    return d
  }
  // "mañana"
  if (/mañana/i.test(text)) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(0, 0, 0, 0)
    return d
  }
  // "hoy"
  if (/hoy/i.test(text)) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }
  // "el lunes|martes|..."
  const dayRe = text.match(/el\s+(lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i)
  if (dayRe) {
    return nextDay(DAYS[dayRe[1].toLowerCase()])
  }
  // "el [día] de [mes]"
  const dateRe = text.match(/el\s+(\d+)\s*de\s*(\w+)/i)
  if (dateRe) {
    const day = parseInt(dateRe[1])
    const month = MONTHS[dateRe[2].toLowerCase()]
    if (month !== undefined) {
      const now = new Date()
      let year = now.getFullYear()
      const d = new Date(year, month, day)
      if (d < now) d.setFullYear(year + 1)
      d.setHours(0, 0, 0, 0)
      return d
    }
  }
  // "próximo lunes|martes|..."
  const nextDayRe = text.match(/próximo\s+(lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i)
  if (nextDayRe) {
    const d = nextDay(DAYS[nextDayRe[1].toLowerCase()])
    // nextDay returns next occurrence, but "próximo" might mean next week
    // Ensure it's at least 7 days away if it's the same day
    const now = new Date()
    if (d <= now) d.setDate(d.getDate() + 7)
    return d
  }
  return null
}

export const parseVoiceText = (text) => {
  const trimmed = text.trim()
  if (!trimmed) return null

  let dateObj = parseDate(trimmed)
  const timeObj = parseTime(trimmed)
  const relativeDate = parseRelative(trimmed)

  if (relativeDate) {
    dateObj = relativeDate
    if (!timeObj) {
      dateObj.setHours(dateObj.getHours(), dateObj.getMinutes() + 1, 0, 0)
    }
  }

  // Si hay hora pero no fecha, la fecha es hoy
  if (timeObj && !dateObj) {
    dateObj = new Date()
    dateObj.setHours(0, 0, 0, 0)
  }

  // Construir dateTime final
  const dt = dateObj ? new Date(dateObj) : new Date()
  if (timeObj) {
    dt.setHours(timeObj.hour, timeObj.minute, 0, 0)
  } else if (dateObj && !relativeDate) {
    // Fecha explícita sin hora: default a las 8:00 AM
    dt.setHours(8, 0, 0, 0)
  } else if (!relativeDate) {
    // Sin fecha ni hora: 1 hora desde ahora
    dt.setHours(dt.getHours() + 1, 0, 0, 0)
  }

  // Extraer título: remover las partes de fecha/hora
  let title = trimmed
    .replace(/pasado\s+mañana/gi, '')
    .replace(/mañana/gi, '')
    .replace(/hoy/gi, '')
    .replace(/el\s+(lunes|martes|miércoles|jueves|viernes|sábado|domingo)/gi, '')
    .replace(/próximo\s+(lunes|martes|miércoles|jueves|viernes|sábado|domingo)/gi, '')
    .replace(/el\s+\d+\s*de\s*\w+/gi, '')
    .replace(/en\s+\d+\s*(minuto|minutos|hora|horas|día|días|semana|semanas)/gi, '')
    .replace(/a\s+las\s+\d+(?:\s*(?:\:|y\s*)?\d+)?/gi, '')
    .replace(/(de\s+la\s+)?(mañana|tarde|noche)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!title) title = trimmed

  const pad = n => String(n).padStart(2, '0')
  const dateTime = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`

  return { title, dateTime }
}
