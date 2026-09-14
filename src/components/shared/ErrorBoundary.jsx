import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100dvh', padding: 32, textAlign: 'center', gap: 16, background: '#0F0F1A', color: '#F1F0FF'
        }}>
          <div style={{ fontSize: '2.5rem' }}>⚠️</div>
          <h2 style={{ margin: 0 }}>Algo salió mal</h2>
          <p style={{ color: '#888', fontSize: '0.875rem', maxWidth: 300 }}>
            La aplicación tuvo un error inesperado. Prueba recargando la página.
          </p>
          <button className="btn btn-primary" onClick={this.handleRetry}>
            Reintentar
          </button>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
