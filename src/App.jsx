import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { RemindersProvider, useReminders } from './context/RemindersContext'

import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CalendarPage from './pages/CalendarPage'
import SharedPage from './pages/SharedPage'
import GroupsPage from './pages/GroupsPage'
import ProfilePage from './pages/ProfilePage'
import BottomNav from './components/layout/BottomNav'
import ReloadPrompt from './components/shared/ReloadPrompt'
import ErrorBoundary from './components/shared/ErrorBoundary'

// Spinner for auth loading
const LoadingScreen = () => (
  <div className="loading-page">
    <div style={{
      width: 56, height: 56,
      background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
      borderRadius: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
      marginBottom: 16
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="2"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="9" y1="16" x2="13" y2="16"/>
      </svg>
    </div>
    <div className="spinner" style={{ width: 28, height: 28 }} />
  </div>
)

// Protected app shell with nav
function AppShell() {
  const { user, loading } = useAuth()
  const { pendingCount } = useReminders()

  if (loading) return <LoadingScreen />
  if (!user) return <LoginPage />

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/shared" element={<SharedPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav pendingCount={pendingCount} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <RemindersProvider>
        <ErrorBoundary>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <ReloadPrompt />
            <AppShell />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#16162A',
                color: '#F1F0FF',
                border: '1px solid rgba(255,255,255,0.10)',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '0.875rem',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                maxWidth: '360px'
              },
              success: {
                iconTheme: { primary: '#06D6A0', secondary: '#0F0F1A' }
              },
              error: {
                iconTheme: { primary: '#EF4444', secondary: '#0F0F1A' }
              }
            }}
          />
        </BrowserRouter>
        </ErrorBoundary>
      </RemindersProvider>
    </AuthProvider>
  )
}
