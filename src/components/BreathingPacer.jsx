import { useEffect, useState } from 'react'

// pattern: "inhale-hold-exhale-hold" in seconds, e.g. "4-7-8-0"
export default function BreathingPacer({ pattern }) {
  const [inhale, hold1, exhale, hold2] = pattern.split('-').map(Number)
  const phases = [
    { name: 'Breathe in', duration: inhale, scale: 1 },
    { name: 'Hold', duration: hold1, scale: 1 },
    { name: 'Breathe out', duration: exhale, scale: 0.55 },
    { name: 'Hold', duration: hold2, scale: 0.55 },
  ].filter((p) => p.duration > 0)

  const [phaseIndex, setPhaseIndex] = useState(0)
  const [count, setCount] = useState(phases[0].duration)

  useEffect(() => {
    const tick = setInterval(() => {
      setCount((c) => {
        if (c > 1) return c - 1
        setPhaseIndex((i) => (i + 1) % phases.length)
        return 0 // replaced immediately by the effect below
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [phases.length])

  useEffect(() => {
    setCount(phases[phaseIndex].duration)
  }, [phaseIndex])

  const phase = phases[phaseIndex]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent) 0%, rgba(227,177,104,0.25) 70%)',
          transform: `scale(${phase.scale})`,
          transition: `transform ${phase.duration}s ease-in-out`,
        }}
      />
      <p style={{ color: 'var(--text)', fontWeight: 600, margin: 0 }}>
        {phase.name} · {count}
      </p>
    </div>
  )
}
