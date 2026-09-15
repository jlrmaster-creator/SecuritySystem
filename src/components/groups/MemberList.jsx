import toast from 'react-hot-toast'

export default function MemberList({ members, currentUserId, onShareToMember, reminders }) {
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => toast.success('Código copiado'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {members.map(member => (
        <div key={member.id} className="member-item">
          <div className="avatar">
            {member.photoURL
              ? <img src={member.photoURL} alt={member.displayName} />
              : (member.displayName?.[0] || '?').toUpperCase()
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }} className="truncate">
              {member.displayName}
              {member.id === currentUserId && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>(Tú)</span>
              )}
            </div>
          </div>
          {onShareToMember && member.id !== currentUserId && (
            <button
              className="btn btn-icon"
              onClick={() => onShareToMember(member)}
              title="Enviar mensaje"
              style={{ flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
