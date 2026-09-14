import { logoutUser } from '../../services/authService'
import { LogoutIcon } from '../shared/Icons'
import toast from 'react-hot-toast'

export default function Header({ title, left, right }) {
  const handleLogout = async () => {
    try { await logoutUser() }
    catch { toast.error('Error al cerrar sesión') }
  }

  return (
    <header className="app-header">
      <div style={{ width: 40, display: 'flex', alignItems: 'center' }}>
        {left}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span className="header-title">{title}</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
      </div>
      <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        {right ?? (
          <button
            onClick={handleLogout}
            className="header-action"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogoutIcon />
          </button>
        )}
      </div>
    </header>
  )
}
