import { StatusDot } from '../ui'
import { DEMO_SECTOR } from '../../data/demo'
import { Link, useLocation } from 'react-router-dom'

export function TopBar() {
  const now = new Date()
  const utcStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
  const location = useLocation()

  const navItems = [
    { name: 'Architecture', path: '/' },
    { name: 'Dashboard', path: '/landing' },
    { name: 'Stack', path: '/stack' },
  ]

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
      </div>

      {/* Center: Navigation */}
      <div className="hidden md:flex items-center gap-8 font-mono text-xs tracking-widest">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                color: isActive ? 'var(--phosphor)' : 'var(--bone)',
                opacity: isActive ? 1 : 0.5,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.target.style.opacity = 0.8
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.target.style.opacity = 0.5
              }}
            >
              {item.name}
            </Link>
          )
        })}
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
