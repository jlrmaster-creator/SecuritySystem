import { useState } from 'react'
import { isToday, isSameDay } from 'date-fns'
import { getCalendarDays, formatMonthYear, prevMonth, nextMonth, isSameDayAs } from '../../utils/dateUtils'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function CalendarView({ reminders = [], selectedDay, onSelectDay }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const days = getCalendarDays(currentMonth)

  const getDotsForDay = (date) => {
    const dayReminders = reminders.filter(r => isSameDayAs(r.dateTime, date))
    return dayReminders.slice(0, 3).map(r => r.color || '#7C3AED')
  }

  return (
    <div className="card" style={{ padding: '16px 12px' }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn btn-icon" onClick={() => setCurrentMonth(prevMonth(currentMonth))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>
          {formatMonthYear(currentMonth)}
        </span>
        <button className="btn btn-icon" onClick={() => setCurrentMonth(nextMonth(currentMonth))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="calendar-grid" style={{ marginBottom: 4 }}>
        {DAY_LABELS.map(d => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="calendar-grid">
        {days.map(({ date, isCurrentMonth }, idx) => {
          const dots = getDotsForDay(date)
          const isSelected = selectedDay && isSameDay(date, selectedDay)
          const todayDay = isToday(date)

          return (
            <button
              key={idx}
              className={[
                'calendar-day',
                !isCurrentMonth ? 'other-month' : '',
                todayDay && !isSelected ? 'today' : '',
                isSelected ? 'selected' : '',
                dots.length > 0 ? 'has-events' : ''
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectDay(date)}
            >
              <span className="day-number">{date.getDate()}</span>
              {dots.length > 0 && !isSelected && (
                <div className="day-dots">
                  {dots.map((color, i) => (
                    <span key={i} className="event-dot" style={{ background: color }} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Today button */}
      {!isToday(selectedDay || currentMonth) && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', marginTop: 12 }}
          onClick={() => { setCurrentMonth(new Date()); onSelectDay(new Date()) }}
        >
          Ir a hoy
        </button>
      )}
    </div>
  )
}
