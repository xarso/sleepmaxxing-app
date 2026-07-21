import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checkInbox, setCheckInbox] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleForgotSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://teal-swan-358daa.netlify.app/',
    })

    if (error) setError(error.message)
    else setResetSent(true)
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { timezone } },
      })
      if (error) {
        setError(error.message)
      } else if (data.user && !data.session) {
        setCheckInbox(true)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  if (checkInbox) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Check your inbox</h1>
          <p style={styles.muted}>
            We sent a confirmation link to {email}. Open it to activate your account.
          </p>
        </div>
      </div>
    )
  }

  if (resetSent) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Check your inbox</h1>
          <p style={styles.muted}>
            We sent a password reset link to {email}. Open it on this device to set a new password.
          </p>
        </div>
      </div>
    )
  }

  if (mode === 'forgot') {
    return (
      <div style={styles.page}>
        <form style={styles.card} onSubmit={handleForgotSubmit}>
          <h1 style={styles.title}>Reset password</h1>
          <p style={styles.muted}>Enter your email and we'll send you a reset link.</p>

          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Working…' : 'Send reset link'}
          </button>

          <button type="button" style={styles.linkButton} onClick={() => setMode('signin')}>
            Back to sign in
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Sleepmaxxing</h1>
        <p style={styles.muted}>
          {mode === 'signin' ? 'Welcome back.' : 'One technique a night. That is the whole app.'}
        </p>

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          minLength={6}
          required
        />

        {error && <p style={styles.error}>{error}</p>}

        {mode === 'signin' && (
          <button type="button" style={styles.forgotLink} onClick={() => setMode('forgot')}>
            Forgot password?
          </button>
        )}

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        {mode === 'signup' && (
          <p style={styles.consent}>
            By creating an account you agree to our{' '}
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={styles.consentLink}>
              Terms
            </a>{' '}
            and{' '}
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={styles.consentLink}>
              Privacy Policy
            </a>
            .
          </p>
        )}

        <button
          type="button"
          style={styles.linkButton}
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? "No account yet? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 600,
    margin: 0,
    color: 'var(--text)',
  },
  muted: {
    color: 'var(--muted)',
    margin: '0 0 12px 0',
    fontSize: '15px',
    lineHeight: 1.4,
  },
  input: {
    background: 'var(--surface)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '14px',
    color: 'var(--text)',
  },
  button: {
    background: 'var(--accent)',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontWeight: 600,
    marginTop: '8px',
    cursor: 'pointer',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    padding: '8px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  error: {
    color: 'var(--danger)',
    fontSize: '14px',
    margin: 0,
  },
  consent: {
    color: 'var(--muted)',
    fontSize: '12px',
    textAlign: 'center',
    margin: '4px 0 0',
  },
  consentLink: {
    color: 'var(--muted)',
    textDecoration: 'underline',
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    fontSize: '13px',
    textAlign: 'right',
    cursor: 'pointer',
    padding: 0,
    margin: '-4px 0 0',
  },
}
