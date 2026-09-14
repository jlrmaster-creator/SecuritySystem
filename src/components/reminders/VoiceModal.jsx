import { useState, useEffect, useRef } from 'react'
import { parseVoiceText } from '../../utils/voiceUtils'
import Modal from '../shared/Modal'

export default function VoiceModal({ open, onClose, onResult }) {
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (!open) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      setTranscript('')
      setListening(false)
      setError(null)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Tu navegador no soporta reconocimiento de voz. Usa Chrome en Android o Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-ES'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => setListening(true)

    recognition.onresult = (event) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) final += text
      }
      if (final) {
        setTranscript(final)
        const parsed = parseVoiceText(final)
        if (parsed) {
          recognition.stop()
          onResult(parsed)
          onClose()
        }
      } else {
        setTranscript(event.results[event.results.length - 1][0].transcript)
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setError('No se detectó voz. Intenta de nuevo.')
      } else if (event.error === 'not-allowed') {
        setError('Permiso de micrófono denegado. Concede acceso en los ajustes.')
      } else {
        setError(`Error: ${event.error}`)
      }
      setListening(false)
    }

    recognition.onend = () => setListening(false)

    recognition.start()
    recognitionRef.current = recognition

    return () => {
      try { recognition.stop() } catch {}
    }
  }, [open])

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '16px 0' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: listening
            ? 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, rgba(124,58,237,0.1) 70%)'
            : 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s',
          animation: listening ? 'pulse 1.2s ease-in-out infinite' : 'none'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
            stroke={listening ? 'var(--primary)' : 'var(--text-muted)'}
            strokeWidth="1.5" strokeLinecap="round"
          >
            <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8"/>
          </svg>
        </div>

        {error ? (
          <p style={{ color: 'var(--red)', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>
        ) : (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', minHeight: 24 }}>
            {listening ? (transcript || 'Escuchando...') : 'Procesando...'}
          </p>
        )}

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {listening
            ? 'Di algo como "Comprar leche mañana a las 5"'
            : (error ? 'Toca "Cerrar" e intenta de nuevo' : '')}
        </p>

        <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: 8 }}>
          Cerrar
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
    </Modal>
  )
}
