import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import DailyView from './pages/DailyView'
import Library from './pages/Library'
import Settings from './pages/Settings'
import ResetPassword from './pages/ResetPassword'
import CrisisFooter from './components/CrisisFooter'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // On first sign-in, make sure a profiles row exists for this user.
  useEffect(() => {
    if (!session?.user) return

    async function ensureProfile() {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!existing) {
        const timezone =
          session.user.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        await supabase.from('profiles').insert({ id: session.user.id, timezone })
      }
    }

    ensureProfile()
  }, [session?.user])

  if (session === undefined) {
    return <div style={{ color: '#8b8fb0', padding: 24 }}>Loading…</div>
  }

  if (passwordRecovery) {
    return <ResetPassword onDone={() => setPasswordRecovery(false)} />
  }

  if (!session) {
    return (
      <>
        <Login />
        <CrisisFooter />
      </>
    )
  }

  return <Home userId={session.user.id} />
}

function Home({ userId }) {
  const [tab, setTab] = useState('today') // 'today' | 'library'

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <TabButton active={tab === 'today'} onClick={() => setTab('today')}>
            Today
          </TabButton>
          <TabButton active={tab === 'library'} onClick={() => setTab('library')}>
            Library
          </TabButton>
          <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
            Settings
          </TabButton>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'var(--text)',
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Sign out
        </button>
      </div>

      <div style={{ paddingTop: 56, paddingBottom: 48 }}>
        {tab === 'today' && <DailyView userId={userId} />}
        {tab === 'library' && <Library userId={userId} />}
        {tab === 'settings' && <Settings userId={userId} />}
      </div>
      <CrisisFooter />
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--accent)' : 'none',
        color: active ? '#1a1a1a' : 'var(--text)',
        border: active ? 'none' : '1px solid rgba(255,255,255,0.2)',
        padding: '6px 12px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  )
}
