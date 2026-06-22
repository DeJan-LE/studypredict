import React from 'react'

interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('StudyPredict render error:', error)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 18,
          background: 'var(--bg-base)', color: 'var(--text-primary)', padding: 32, textAlign: 'center',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'var(--accent-dim)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 28,
          }}>↻</div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
              Kurzer Moment
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320, lineHeight: 1.6 }}>
              Die Seite muss einmal neu geladen werden. Deine Daten bleiben erhalten.
            </p>
          </div>
          <button
            onClick={this.handleReload}
            style={{
              padding: '11px 22px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--accent), #a855f7)',
              color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
              boxShadow: '0 4px 16px var(--accent-glow)',
            }}>
            Neu laden
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
