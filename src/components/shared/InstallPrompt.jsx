import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null)
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    const handleInstallable = event => {
      event.preventDefault()
      setInstallEvent(event)
      setVisible(true)
    }
    const handleInstalled = () => {
      setInstallEvent(null)
      setVisible(false)
    }
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !window.matchMedia('(display-mode: standalone)').matches
    setIos(isIos)
    if (isIos) setVisible(true)
    window.addEventListener('beforeinstallprompt', handleInstallable)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallable)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (!visible || (!installEvent && !ios)) return null

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    setVisible(false)
    setInstallEvent(null)
  }

  return (
    <div className="install-prompt" role="status">
      <div>
        <strong>Instala SecuritySystem</strong>
        <span>Accede más rápido desde tu móvil.</span>
      </div>
      {installEvent
        ? <button type="button" className="btn btn-primary btn-sm" onClick={install}>Instalar</button>
        : <span className="install-ios-hint">Compartir → Añadir a inicio</span>}
      <button type="button" className="install-prompt-close" aria-label="Cerrar aviso" onClick={() => setVisible(false)}>×</button>
    </div>
  )
}
