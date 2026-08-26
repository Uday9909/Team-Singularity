export function StatusDot({ live = true, size = 8, className = '' }) {
  return (
    <span
      className={`inline-block rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: live ? 'var(--phosphor)' : '#666',
        boxShadow: live ? 'var(--glow-green)' : 'none',
        animation: live ? 'status-blink 1.8s ease-in-out infinite' : 'none',
      }}
      aria-label={live ? 'Live' : 'Offline'}
    />
  )
}

export function AmberBadge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold ${className}`}
      style={{
        backgroundColor: 'rgba(255,176,0,0.15)',
        color: 'var(--amber)',
        border: '1px solid rgba(255,176,0,0.4)',
        boxShadow: '0 0 8px rgba(255,176,0,0.2)',
      }}
    >
      {children}
    </span>
  )
}

export function GlassCard({ children, className = '', amber = false, style = {} }) {
  return (
    <div
      className={`glass-card p-5 ${className}`}
      style={{
        ...(amber ? {
          borderColor: 'rgba(255,176,0,0.35)',
          boxShadow: '0 0 20px rgba(255,176,0,0.1)',
        } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children, className = '' }) {
  return (
    <p
      className={`font-mono text-xs tracking-widest uppercase mb-3 ${className}`}
      style={{ color: 'var(--phosphor)', opacity: 0.7 }}
    >
      {children}
    </p>
  )
}
