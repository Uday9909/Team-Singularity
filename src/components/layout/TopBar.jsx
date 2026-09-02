import { StatusDot } from '../ui'
import { DEMO_SECTOR } from '../../data/demo'
import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

export function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false)
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
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-2"
      style={{
        background: 'rgba(11,15,10,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--hairline)',
        height: '44px',
      }}
    >
      {/* Left: system identity */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Logo mark */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" className="shrink-0">
          <circle cx="11" cy="11" r="10" stroke="var(--phosphor)" strokeWidth="1.5" opacity="0.6" />
          <circle cx="11" cy="11" r="6" stroke="var(--phosphor)" strokeWidth="1" opacity="0.4" />
          <circle cx="11" cy="11" r="2.5" fill="var(--phosphor)" />
          <line x1="11" y1="1" x2="11" y2="21" stroke="var(--phosphor)" strokeWidth="0.75" opacity="0.3" />
          <line x1="1" y1="11" x2="21" y2="11" stroke="var(--phosphor)" strokeWidth="0.75" opacity="0.3" />
        </svg>
        <span
          className="font-mono font-bold text-xs sm:text-sm whitespace-nowrap"
          style={{ color: 'var(--phosphor)', letterSpacing: '0.1em' }}
        >
          TRITON WATCH
        </span>
      </div>

      {/* Center: Navigation (Desktop) */}
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
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <StatusDot live={true} size={7} />
          <span
            className="font-mono text-[10px] sm:text-xs"
            style={{ color: 'var(--phosphor)', opacity: 0.85 }}
          >
            LIVE
          </span>
        </div>
        <span
          id="topbar-timestamp"
          className="font-mono text-xs hidden lg:inline"
          style={{ color: 'var(--bone)', opacity: 0.4 }}
        >
          {utcStr}
        </span>

        {/* Hamburger Menu Toggle (Mobile) */}
        <button
          className="md:hidden flex items-center justify-center p-2 rounded hover:bg-white/5 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bone)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      <div
        className="md:hidden absolute top-[44px] left-0 right-0 z-40 flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ease-out"
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: menuOpen ? '1px solid #00E5FF' : '1px solid transparent',
          maxHeight: menuOpen ? '300px' : '0px',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className="py-5 font-mono text-sm tracking-widest border-t transition-all active:bg-white/5"
              style={{
                paddingLeft: '24px',
                paddingRight: '24px',
                borderColor: 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#00E5FF' : 'var(--bone)',
                borderLeft: isActive ? '4px solid #00E5FF' : '4px solid transparent',
                textShadow: isActive ? '0 0 12px rgba(0,229,255,0.6)' : 'none',
                backgroundColor: isActive ? 'rgba(0,229,255,0.05)' : 'transparent',
              }}
            >
              {item.name}
            </Link>
          )
        })}
      </div>
    </header>
  )
}
