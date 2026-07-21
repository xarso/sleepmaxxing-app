import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['all', 'sleep', 'overthinking', 'anxiety', 'stress', 'focus']

export default function Library({ userId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPro, setIsPro] = useState(false)
  const [rows, setRows] = useState([])
  const [category, setCategory] = useState('all')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr) return fail(profileErr)

    const pro = profile?.subscription_tier === 'pro'
    setIsPro(pro)

    let query = supabase
      .from('daily_assignments')
      .select('id, assigned_date, techniques(name, category, duration_min), mood_checkins(mood_before, mood_after)')
      .eq('user_id', userId)
      .order('assigned_date', { ascending: false })

    // Free tier: last 7 days only. Pro: no limit.
    if (!pro) query = query.limit(7)

    const { data, error: rowsErr } = await query

    if (rowsErr) return fail(rowsErr)

    setRows(data || [])
    setLoading(false)
  }

  function fail(err) {
    console.error(err)
    setError(err.message || 'Something went wrong.')
    setLoading(false)
  }

  async function startUpgrade() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    try {
      const res = await fetch('https://xarso.app.n8n.cloud/webhook/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        fail(new Error('Checkout session did not return a URL.'))
      }
    } catch (err) {
      fail(err)
    }
  }

  if (loading) return <Centered>Loading library…</Centered>
  if (error) return <Centered>Something broke: {error}</Centered>

  const filtered =
    category === 'all' ? rows : rows.filter((r) => r.techniques?.category === category)

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Library</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
        {isPro ? 'Full history' : 'Last 7 days'}
      </p>

      {!isPro && (
        <button
          onClick={startUpgrade}
          style={{
            background: 'var(--accent)',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: 10,
            padding: '10px 16px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          Upgrade to Pro — $4.99/mo
        </button>
      )}

      {isPro && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                background: category === c ? 'var(--accent)' : 'var(--surface)',
                color: category === c ? '#1a1a1a' : 'var(--text)',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>Nothing here yet. Complete a technique to start your history.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((row) => {
          const t = row.techniques
          const checkin = row.mood_checkins?.[0]
          const delta =
            checkin?.mood_before != null && checkin?.mood_after != null
              ? checkin.mood_after - checkin.mood_before
              : null

          return (
            <div
              key={row.id}
              style={{
                background: 'var(--surface)',
                borderRadius: 10,
                padding: 12,
              }}
            >
              <p style={{ color: 'var(--accent)', fontSize: 12, margin: 0 }}>
                {row.assigned_date} · {t?.category}
              </p>
              <p style={{ fontWeight: 600, margin: '2px 0' }}>{t?.name}</p>
              {delta != null && (
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                  mood {checkin.mood_before} → {checkin.mood_after}
                  {delta > 0 ? ` (+${delta})` : delta < 0 ? ` (${delta})` : ' (no change)'}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Centered({ children }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        color: 'var(--text)',
      }}
    >
      {children}
    </div>
  )
}
