import { useRegisterSW } from 'virtual:pwa-register/react'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (!r) return
      const interval = setInterval(() => { r.update() }, 60 * 60 * 1000)
      r.addEventListener('statechange', () => {
        if (r.state === 'redundant') clearInterval(interval)
      })
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    }
  })

  useEffect(() => {
    if (needRefresh) {
      toast(
        (t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontWeight: 600 }}>✨ Nueva versión disponible</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Actualiza para obtener las últimas mejoras.
            </span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button 
                className="btn btn-primary btn-sm" 
                style={{ flex: 1 }}
                onClick={() => { updateServiceWorker(true); toast.dismiss(t.id) }}
              >
                Actualizar
              </button>
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ flex: 1 }}
                onClick={() => { setNeedRefresh(false); toast.dismiss(t.id) }}
              >
                Ignorar
              </button>
            </div>
          </div>
        ),
        { 
          duration: Infinity, 
          id: 'pwa-update',
          style: { minWidth: '300px' }
        }
      )
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh])

  return null
}
