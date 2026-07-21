import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword({ onDone }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)

    if (error) setError(error.message)
    else setDone(true)
  }

  if (done) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Password updated</h1>
          <p style={styles.muted}>You're all set.</p>
          <button style={styles.button} onClick={onDone}>
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Set a new password</h1>

        <input
          style={styles.input}
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Working…' : 'Update password'}
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
    fontSize: '24px',
    fontWeight: 600,
    margin: 0,
    color: 'var(--text)',
  },
  muted: {
    color: 'var(--muted)',
    margin: '0 0 12px 0',
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
  error: {
    color: 'var(--danger)',
    fontSize: '14px',
    margin: 0,
  },
}
