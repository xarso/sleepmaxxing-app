import { useEffect, useState } from 'react'

export default function CountdownTimer({ minutes }) {
  const [secondsLeft, setSecondsLeft] = useState(null) // null = not started

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft])

  if (secondsLeft === null) {
    return (
      <button onClick={() => setSecondsLeft(minutes * 60)} style={buttonStyle}>
        Start {minutes}-min timer
      </button>
    )
  }

  if (secondsLeft <= 0) {
    return <p style={{ color: 'var(--accent)', fontWeight: 600 }}>Time's up.</p>
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <p style={{ color: 'var(--accent)', fontSize: 32, fontWeight: 600, margin: '16px 0', fontVariantNumeric: 'tabular-nums' }}>
      {mm}:{ss}
    </p>
  )
}

const buttonStyle = {
  background: 'none',
  border: '1px solid var(--accent)',
  color: 'var(--accent)',
  borderRadius: 10,
  padding: '10px 16px',
  cursor: 'pointer',
  margin: '12px 0',
}
