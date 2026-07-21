export default function CrisisFooter() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--surface)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: 11,
        color: 'var(--muted)',
        zIndex: 10,
      }}
    >
      This app doesn't replace professional mental health care. If you're in
      crisis: in the US, call or text 988. Outside the US, find a local
      helpline at{' '}
      <a
        href="https://findahelpline.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--accent)' }}
      >
        findahelpline.com
      </a>
      .
      <div style={{ marginTop: 4 }}>
        <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)' }}>
          Terms
        </a>
        {' · '}
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)' }}>
          Privacy
        </a>
      </div>
    </div>
  )
}
