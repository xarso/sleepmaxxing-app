import { Component } from 'react'

// Catches render errors anywhere below it and shows a recoverable screen
// instead of a blank white page. Reloading the app is usually enough to
// recover, since most errors here are caused by a stale network response
// or an unexpected null value, not a permanently broken state.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Caught by ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
            color: 'var(--text)',
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went sideways.</h1>
          <p style={{ color: 'var(--muted)', marginBottom: 20, maxWidth: 320 }}>
            Not your fault. Reloading usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--accent)',
              color: '#1a1a1a',
              border: 'none',
              borderRadius: 10,
              padding: '12px 20px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
