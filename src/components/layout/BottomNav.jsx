import { NavLink } from 'react-router-dom'
import { HomeIcon, CalIcon, ShareIcon, GroupIcon, UserIcon } from '../shared/Icons'

export default function BottomNav({ pendingCount = 0 }) {
  const navItems = [
    { to: '/', label: 'Inicio', Icon: HomeIcon },
    { to: '/calendar', label: 'Calendario', Icon: CalIcon },
    { to: '/shared', label: 'Recibidos', Icon: ShareIcon, badge: pendingCount },
    { to: '/groups', label: 'Grupos', Icon: GroupIcon },
    { to: '/profile', label: 'Perfil', Icon: UserIcon },
  ]

  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, label, Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon-wrapper" style={{ position: 'relative' }}>
            <Icon />
            {badge > 0 && <span className="nav-badge">{badge > 9 ? '9+' : badge}</span>}
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
