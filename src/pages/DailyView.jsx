import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import BreathingPacer from '../components/BreathingPacer'
import CountdownTimer from '../components/CountdownTimer'

// Single shared ambient bed, played under any technique's narration.
// Swap this URL to change the ambient sound for every guided session at once.
const AMBIENT_URL =
  'https://zpqhnxcolsqibyfseflz.supabase.co/storage/v1/object/public/guided-sessions/ambient-drone.mp3'

// Formats a Date, offset by `daysOffset` days, as YYYY-MM-DD in the given timezone.
function dateInTimezone(timezone, daysOffset = 0) {
  const d = new Date(Date.now() + daysOffset * 86400000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(d) // en-CA -> YYYY-MM-DD
}

export default function DailyView({ userId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [assignment, setAssignment] = useState(null) // { id, technique }
  const [checkin, setCheckin] = useState(null) // mood_checkins row or null
  const [timezone, setTimezone] = useState(null)
  const [streak, setStreak] = useState(null) // streaks row or null
  const [freezeUsedNotice, setFreezeUsedNotice] = useState(false)

  useEffect(() => {
    loadOrCreateToday()
  }, [])

  async function loadOrCreateToday() {
    setLoading(true)
    setError(null)

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr) return fail(profileErr)

    // Profile row may not exist yet on the very first sign-in (race with
    // App.jsx's profile-creation effect). Fall back to the browser's
    // timezone rather than failing — it's corrected on next load.
    const tz = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimezone(tz)
    const today = dateInTimezone(tz)

    // 1. Look for an existing assignment for today.
    const { data: existing, error: existingErr } = await supabase
      .from('daily_assignments')
      .select('id, technique_id, techniques(*)')
      .eq('user_id', userId)
      .eq('assigned_date', today)
      .maybeSingle()

    if (existingErr) return fail(existingErr)

    let currentAssignment = existing

    // 2. None yet -> pick a random technique and create it.
    if (!currentAssignment) {
      const { data: allTechniques, error: techErr } = await supabase
        .from('techniques')
        .select('id')

      if (techErr) return fail(techErr)
      if (!allTechniques || allTechniques.length === 0) {
        return fail(new Error('No techniques found in the library.'))
      }

      const pick = allTechniques[Math.floor(Math.random() * allTechniques.length)]

      const { data: created, error: createErr } = await supabase
        .from('daily_assignments')
        .insert({ user_id: userId, technique_id: pick.id, assigned_date: today })
        .select('id, technique_id, techniques(*)')
        .single()

      if (createErr) return fail(createErr)
      currentAssignment = created
    }

    setAssignment(currentAssignment)

    // 3. Load the mood check-in row for this assignment, if any.
    const { data: existingCheckin, error: checkinErr } = await supabase
      .from('mood_checkins')
      .select('*')
      .eq('daily_assignment_id', currentAssignment.id)
      .maybeSingle()

    if (checkinErr) return fail(checkinErr)

    setCheckin(existingCheckin)

    // 4. Load the streak row for display (read-only here; updated on completion).
    const { data: existingStreak, error: streakErr } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (streakErr) return fail(streakErr)

    setStreak(existingStreak)
    setLoading(false)
  }

  function fail(err) {
    console.error(err)
    setError(err.message || 'Something went wrong.')
    setLoading(false)
  }

  async function submitMoodBefore(value) {
    const { data, error } = await supabase
      .from('mood_checkins')
      .insert({ user_id: userId, daily_assignment_id: assignment.id, mood_before: value })
      .select()
      .single()

    if (error) return fail(error)
    setCheckin(data)
  }

  async function submitMoodAfter(value) {
    const { data, error } = await supabase
      .from('mood_checkins')
      .update({ mood_after: value, completed_at: new Date().toISOString() })
      .eq('id', checkin.id)
      .select()
      .single()

    if (error) return fail(error)
    setCheckin(data)
    await updateStreak()
  }

  async function updateStreak() {
    const today = dateInTimezone(timezone)
    const yesterday = dateInTimezone(timezone, -1)
    const currentMonth = today.slice(0, 7) // 'YYYY-MM'

    let next
    let freezeUsed = false

    if (!streak) {
      next = {
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        freezes_used_this_month: 0,
        freeze_month: currentMonth,
        last_completed_date: today,
      }
    } else if (streak.last_completed_date === today) {
      return // Already recorded today — no-op.
    } else {
      let currentStreak = streak.current_streak
      let freezesUsed = streak.freeze_month === currentMonth ? streak.freezes_used_this_month : 0

      if (streak.last_completed_date === yesterday) {
        currentStreak += 1
      } else if (freezesUsed < 1) {
        // Gap of 2+ days, but this month's freeze hasn't been used yet.
        freezesUsed += 1
        currentStreak += 1
        freezeUsed = true
      } else {
        currentStreak = 1 // Streak broken, no freeze left.
      }

      next = {
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: Math.max(streak.longest_streak, currentStreak),
        freezes_used_this_month: freezesUsed,
        freeze_month: currentMonth,
        last_completed_date: today,
      }
    }

    const { data: saved, error: upsertErr } = await supabase
      .from('streaks')
      .upsert(next)
      .select()
      .single()

    if (upsertErr) return fail(upsertErr)
    setStreak(saved)
    setFreezeUsedNotice(freezeUsed)
  }

  if (loading) return <Centered>Loading today's technique…</Centered>
  if (error) return <Centered>Something broke: {error}</Centered>

  const technique = assignment.techniques

  // Stage 1: no check-in yet -> ask mood before.
  if (!checkin) {
    return (
      <MoodPrompt
        title="How are you feeling right now?"
        onSelect={submitMoodBefore}
      />
    )
  }

  // Stage 2: mood_before set, mood_after not yet -> show the technique.
  if (checkin.mood_after == null) {
    return (
      <TechniqueCard
        technique={technique}
        onComplete={() => setCheckin({ ...checkin, __showAfterPrompt: true })}
        showAfterPrompt={checkin.__showAfterPrompt}
        onMoodAfter={submitMoodAfter}
      />
    )
  }

  // Stage 3: done for today.
  const delta = checkin.mood_after - checkin.mood_before
  const message = getEncouragementMessage(streak?.current_streak || 1, delta)
  return (
    <Centered>
      <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Done for today.</h1>
      <p style={{ color: 'var(--muted)' }}>
        {technique.name} — mood went from {checkin.mood_before} to {checkin.mood_after}
        {delta > 0 ? ` (+${delta})` : delta < 0 ? ` (${delta})` : ' (no change)'}
      </p>
      {streak && (
        <p style={{ color: 'var(--accent)', fontWeight: 600, marginTop: 12 }}>
          🔥 {streak.current_streak}-day streak
          {freezeUsedNotice ? ' (freeze used to keep it alive)' : ''}
        </p>
      )}
      <p
        style={{
          color: 'var(--text)',
          fontSize: 15,
          lineHeight: 1.5,
          marginTop: 20,
          maxWidth: 320,
          fontStyle: 'italic',
        }}
      >
        {message}
      </p>
    </Centered>
  )
}

// Picks a short, contextual encouragement line based on streak length and
// how much mood shifted during the session. No AI call, no external data —
// pure local selection so it's free and instant.
function getEncouragementMessage(streakCount, moodDelta) {
  if (streakCount === 1) {
    return "The first night is the hardest one to show up for. You did it."
  }
  if (moodDelta >= 2) {
    return "That's a real shift. Your body noticed, even if your mind is still catching up."
  }
  if (streakCount >= 7) {
    return `${streakCount} nights in a row. This isn't a habit anymore — it's just who you are now.`
  }
  if (streakCount >= 3) {
    return `${streakCount} nights in a row. Your body is starting to recognize the pattern.`
  }
  if (moodDelta <= 0) {
    return "Some nights don't feel different right away. Showing up still counts."
  }
  return "Small shift, real shift. See you tomorrow night."
}

function MoodPrompt({ title, onSelect }) {
  return (
    <Centered>
      <h1 style={{ fontSize: 20, margin: '0 0 16px' }}>{title}</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onSelect(n)} style={moodButtonStyle}>
            {n}
          </button>
        ))}
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 12 }}>1 = rough · 5 = great</p>
    </Centered>
  )
}

function TechniqueCard({ technique, onComplete, showAfterPrompt, onMoodAfter }) {
  if (showAfterPrompt) {
    return <MoodPrompt title="How do you feel now?" onSelect={onMoodAfter} />
  }

  return (
    <Centered>
      <p style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 4 }}>
        {technique.category} · {technique.duration_min} min
      </p>
      <h1 style={{ fontSize: 22, margin: '0 0 12px' }}>{technique.name}</h1>

      {technique.audio_url ? (
        <AudioSession audioUrl={technique.audio_url} onComplete={onComplete} />
      ) : (
        <>
          <p style={{ color: 'var(--text)', lineHeight: 1.5, maxWidth: 360 }}>
            {technique.description}
          </p>
          {technique.breathing_pattern ? (
            <BreathingPacer pattern={technique.breathing_pattern} />
          ) : (
            <CountdownTimer minutes={technique.duration_min} />
          )}
          <button onClick={onComplete} style={{ ...moodButtonStyle, width: '100%', marginTop: 20 }}>
            I did this
          </button>
        </>
      )}
    </Centered>
  )
}

// Guided audio session: plays the technique's narration over a slow-breathing
// gradient visual. Falls back gracefully — if the audio fails to load, the
// person can still mark the session complete manually.
function AudioSession({ audioUrl, onComplete }) {
  const audioRef = useRef(null)
  const ambientRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0–1
  const [duration, setDuration] = useState(0)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration)
    }
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => {
      setIsPlaying(false)
      const ambient = ambientRef.current
      if (ambient) {
        ambient.pause()
        ambient.currentTime = 0
      }
    }
    const onError = () => setLoadError(true)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [])

  // Keep the ambient bed at a low, unobtrusive volume — it should support
  // the narration, never compete with it.
  useEffect(() => {
    if (ambientRef.current) ambientRef.current.volume = 0.18
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    const ambient = ambientRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      ambient?.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      ambient?.play().catch(() => {}) // ambient is a nice-to-have; narration still works if it fails
      setIsPlaying(true)
    }
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      <ParticleField isPlaying={isPlaying} />

      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <audio ref={ambientRef} src={AMBIENT_URL} loop preload="none" />

      {loadError ? (
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 16 }}>
          Audio couldn't load. You can still mark this session complete.
        </p>
      ) : (
        <>
          <button
            onClick={togglePlay}
            style={{
              ...moodButtonStyle,
              width: 64,
              height: 64,
              borderRadius: '50%',
              fontSize: 22,
              margin: '20px auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>

          <div
            style={{
              width: '100%',
              height: 4,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: 'var(--accent)',
                transition: 'width 0.2s linear',
              }}
            />
          </div>

          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
            {formatTime(audioRef.current?.currentTime)} / {formatTime(duration)}
          </p>
        </>
      )}

      <button onClick={onComplete} style={{ ...moodButtonStyle, width: '100%', marginTop: 20 }}>
        I did this
      </button>
    </div>
  )
}

// Particles start scattered and agitated, then settle — slowly converging
// toward the center and calming into a gentle orbit. Visual metaphor for
// what the technique does: a scattered mind, settling. Pure canvas, no
// libraries, no cost.
function ParticleField({ isPlaying }) {
  const canvasRef = useRef(null)
  const particlesRef = useRef(null)
  const rafRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const cx = width / 2
    const cy = height / 2
    const COUNT = 46
    const COLORS = ['#a396e8', '#e8c07d', '#6c5fb5']

    if (!particlesRef.current) {
      particlesRef.current = Array.from({ length: COUNT }, () => {
        const angle = Math.random() * Math.PI * 2
        const dist = 40 + Math.random() * Math.min(width, height) * 0.42
        return {
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 1.4,
          vy: (Math.random() - 0.5) * 1.4,
          orbitR: 20 + Math.random() * 55,
          orbitSpeed: (0.15 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1),
          orbitAngle: Math.random() * Math.PI * 2,
          size: 1.2 + Math.random() * 2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        }
      })
    }

    function draw(now) {
      if (startTimeRef.current === null) startTimeRef.current = now
      const elapsed = (now - startTimeRef.current) / 1000 // seconds since start
      // Settle progress: fully agitated at 0s, fully calm by ~14s.
      const settle = Math.min(1, elapsed / 14)

      ctx.clearRect(0, 0, width, height)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.6)
      bg.addColorStop(0, '#23264d')
      bg.addColorStop(1, '#14162b')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      for (const p of particlesRef.current) {
        // Agitated free drift, fading out as settle increases.
        p.x += p.vx * (1 - settle)
        p.y += p.vy * (1 - settle)

        // Gentle orbit target, fading in as settle increases.
        p.orbitAngle += 0.008 * p.orbitSpeed
        const targetX = cx + Math.cos(p.orbitAngle) * p.orbitR
        const targetY = cy + Math.sin(p.orbitAngle) * p.orbitR

        const drawX = p.x + (targetX - p.x) * settle * 0.05
        const drawY = p.y + (targetY - p.y) * settle * 0.05
        p.x = p.x + (targetX - p.x) * settle * 0.006
        p.y = p.y + (targetY - p.y) * settle * 0.006

        ctx.beginPath()
        ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = 0.75
        ctx.fill()
        ctx.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(draw)
    } else {
      // Paused: draw one static frame so it doesn't look broken/blank.
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#14162b'
      ctx.fillRect(0, 0, width, height)
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: 220,
        borderRadius: 16,
        display: 'block',
        opacity: isPlaying ? 1 : 0.5,
        transition: 'opacity 0.5s ease',
      }}
    />
  )
}

function Centered({ children }) {
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
      {children}
    </div>
  )
}

const moodButtonStyle = {
  background: 'var(--accent)',
  color: '#1a1a1a',
  border: 'none',
  borderRadius: 10,
  padding: '12px 18px',
  fontWeight: 600,
  cursor: 'pointer',
}
