import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthChange, getUserProfile, logoutUser } from '../services/authService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const inactivityTimer = useRef(null)
  const sessionTimeoutMs = Math.max(
    5,
    Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES || 30)
  ) * 60 * 1000

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const prof = await getUserProfile(firebaseUser.uid)
        setProfile(prof)
      }
      setLoading(false)
    })

    return () => {
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!user) return undefined
    const resetTimer = () => {
      window.clearTimeout(inactivityTimer.current)
      inactivityTimer.current = window.setTimeout(() => {
        logoutUser()
      }, sessionTimeoutMs)
    }
    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach(event => window.addEventListener(event, resetTimer))
    resetTimer()
    return () => {
      window.clearTimeout(inactivityTimer.current)
      events.forEach(event => window.removeEventListener(event, resetTimer))
    }
  }, [user, sessionTimeoutMs])

  const refreshProfile = async () => {
    if (user) {
      const prof = await getUserProfile(user.uid)
      setProfile(prof)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
