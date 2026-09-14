import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { subscribeToMyReminders, subscribeToMySentShares } from '../services/remindersService'

const RemindersContext = createContext(null)

export const RemindersProvider = ({ children }) => {
  const { user } = useAuth()
  const [reminders, setReminders] = useState([])
  const [sentShares, setSentShares] = useState([])

  useEffect(() => {
    if (!user) return
    const unsub1 = subscribeToMyReminders(user.uid, setReminders)
    const unsub2 = subscribeToMySentShares(user.uid, setSentShares)
    return () => { unsub1(); unsub2() }
  }, [user])

  const pendingCount = reminders.filter(r => r.isShared && r.status === 'pending').length

  return (
    <RemindersContext.Provider value={{ reminders, sentShares, pendingCount }}>
      {children}
    </RemindersContext.Provider>
  )
}

export const useReminders = () => {
  const ctx = useContext(RemindersContext)
  if (!ctx) throw new Error('useReminders must be used within RemindersProvider')
  return ctx
}
