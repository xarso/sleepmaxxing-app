import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TIMEZONES = typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone')
  : [Intl.DateTimeFormat().resolvedOptions().timeZone]

export default function Settings({ userId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [reminderHour, setReminderHour] = useState(8)
  const [timezone, setTimezone] = useState('UTC')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data, error } = await supabase
      .from('profiles')
      .select('reminder_hour, timezone')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      setError(error.message)
    } else if (data) {
      setReminderHour(data.reminder_hour ?? 8)
      setTimezone(data.timezone ?? 'UTC')
    }
    setLoading(false)
  }

  async function save() {
    setSaved(false)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ reminder_hour: reminderHour, timezone })
      .eq('id', userId)

    if (error) setError(error.message)
    else setSaved(true)
  }

  async function changePassword() {
    setPasswordSaved(false)
    setPasswordError(null)

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSaved(true)
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  if (loading) return <p style={{ padding: 24, color: 'var(--muted)' }}>Loading…</p>

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Settings</h1>

      <label style={label}>Reminder time</label>
      <select
        value={reminderHour}
        onChange={(e) => setReminderHour(Number(e.target.value))}
        style={input}
      >
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>
            {h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}
          </option>
        ))}
      </select>

      <label style={label}>Timezone</label>
      <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={input}>
        {TIMEZONES.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </select>

      {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
      {saved && <p style={{ color: 'var(--accent)', fontSize: 13 }}>Saved.</p>}

      <button onClick={save} style={button}>
        Save
      </button>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '32px 0' }} />

      <h2 style={{ fontSize: 17, color: 'var(--accent)', marginBottom: 12 }}>Change password</h2>

      <label style={label}>New password</label>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        style={input}
        autoComplete="new-password"
      />

      <label style={label}>Confirm new password</label>
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        style={input}
        autoComplete="new-password"
      />

      {passwordError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{passwordError}</p>}
      {passwordSaved && <p style={{ color: 'var(--accent)', fontSize: 13 }}>Password updated.</p>}

      <button onClick={changePassword} style={button}>
        Update password
      </button>
    </div>
  )
}

const label = { display: 'block', color: 'var(--muted)', fontSize: 13, margin: '16px 0 6px' }
const input = {
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: 12,
  color: 'var(--text)',
}
const button = {
  marginTop: 20,
  background: 'var(--accent)',
  color: '#1a1a1a',
  border: 'none',
  borderRadius: 10,
  padding: '12px 18px',
  fontWeight: 600,
  cursor: 'pointer',
}
