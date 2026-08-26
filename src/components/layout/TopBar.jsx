import { StatusDot } from '../ui'
import { DEMO_SECTOR } from '../../data/demo'

export function TopBar() {
  const now = new Date()
  const utcStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-2"
      style={{
        background: 'rgba(11,15,10,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--hairline)',
        height: '44px',
      }}
    >
      {/* Left: system identity */}
      <div className="flex items-center gap-3">
        {/* Logo mark */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="10" stroke="var(--phosphor)" strokeWidth="1.5" opacity="0.6" />
          <circle cx="11" cy="11" r="6" stroke="var(--phosphor)" strokeWidth="1" opacity="0.4" />
          <circle cx="11" cy="11" r="2.5" fill="var(--phosphor)" />
          <line x1="11" y1="1" x2="11" y2="21" stroke="var(--phosphor)" strokeWidth="0.75" opacity="0.3" />
          <line x1="1" y1="11" x2="21" y2="11" stroke="var(--phosphor)" strokeWidth="0.75" opacity="0.3" />
        </svg>
        <span
          className="font-mono font-bold tracking-widest text-sm"
          style={{ color: 'var(--phosphor)', letterSpacing: '0.2em' }}
        >
          TRITON WATCH
        </span>
        <span
          className="font-mono text-xs hidden sm:inline"
          style={{ color: 'var(--bone)', opacity: 0.4 }}
        >
          / SIH26143
        </span>
      </div>

      {/* Center: sector */}
      <div
        className="font-mono text-xs tracking-widest hidden md:block"
        style={{ color: 'var(--bone)', opacity: 0.5 }}
      >
        {DEMO_SECTOR}
      </div>

      {/* Right: live status + timestamp */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <StatusDot live={true} size={7} />
          <span
            className="font-mono text-xs"
            style={{ color: 'var(--phosphor)', opacity: 0.85 }}
          >
            LIVE
          </span>
        </div>
        <span
          id="topbar-timestamp"
          className="font-mono text-xs hidden sm:inline"
          style={{ color: 'var(--bone)', opacity: 0.4 }}
        >
          {utcStr}
        </span>
      </div>
    </header>
  )
}
