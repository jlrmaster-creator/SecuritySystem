import { useState } from 'react'
import {
  loginUser, loginWithGoogle, registerUser, getSignInMethodsForEmail,
  getLoginLockout, recordLoginFailure, clearLoginFailures
} from '../services/authService'
import toast from 'react-hot-toast'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(0)

  const remainingLockout = Math.max(0, lockedUntil - Date.now())

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Completa todos los campos'); return }
    setLoading(true)
    try {
      if (mode === 'register') {
        if (!displayName) { toast.error('Introduce tu nombre'); setLoading(false); return }
        // comprobar si el email ya tiene métodos de acceso (auth) antes de crear
        try {
          const methods = await getSignInMethodsForEmail(email)
          if (methods && methods.length > 0) {
            const hint = methods.includes('google.com') ? 'Este email está registrado con Google. Inicia sesión con Google o vincula la cuenta.' : 'Email ya registrado'
            toast.error(hint)
            setLoading(false)
            return
          }
        } catch (e) {
          // si la comprobación falla dejamos que createUser maneje el error
        }
        await registerUser(email, password, displayName)
        toast.success('¡Cuenta creada! 🎉')
      } else {
        const currentLockout = getLoginLockout(email)
        if (currentLockout) {
          setLockedUntil(currentLockout)
          toast.error(`Demasiados intentos. Espera ${Math.ceil((currentLockout - Date.now()) / 60000)} minutos.`)
          return
        }
        await loginUser(email, password)
        clearLoginFailures(email)
        toast.success('¡Bienvenido de vuelta!')
      }
    } catch (err) {
      if (mode === 'login') {
        const nextLockout = recordLoginFailure(email)
        setLockedUntil(nextLockout)
      }
      const msg = err.code === 'auth/user-not-found' ? 'Usuario no encontrado'
        : err.code === 'auth/wrong-password' ? 'Contraseña incorrecta'
        : err.code === 'auth/email-already-in-use' ? 'Email ya registrado'
        : err.code === 'auth/weak-password' ? 'Contraseña muy corta (mín. 6 caracteres)'
        : err.code === 'auth/invalid-email' ? 'Email no válido'
        : err.message
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      await loginWithGoogle()
      toast.success('¡Bienvenido!')
    } catch {
      toast.error('Error al iniciar con Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card anim-scale-in">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="2"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <span className="auth-logo-text">SecuritySystem</span>
        </div>

        <p className="auth-subtitle">
          {mode === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta gratuita'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Tu nombre</label>
              <input
                className="form-input"
                placeholder="¿Cómo te llamamos?"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus={mode === 'login'}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-input"
              placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || remainingLockout > 0}>
            {loading
              ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: '2px' }} />
              : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'
            }
          </button>

          <div className="auth-divider"><span>o continúa con</span></div>

          <button type="button" className="btn-google" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon /> Google
          </button>
        </form>

        <div className="auth-switch" style={{ marginTop: 20 }}>
          {mode === 'login' ? (
            <>¿Sin cuenta? <button onClick={() => setMode('register')}>Regístrate gratis</button></>
          ) : (
            <>¿Ya tienes cuenta? <button onClick={() => setMode('login')}>Inicia sesión</button></>
          )}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
          v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
        </div>
      </div>
    </div>
  )
}
