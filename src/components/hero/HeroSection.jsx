

import { SpillHudOverlay } from './SpillHudOverlay'

/**
 * Hero section — Ops terminal aesthetic.
 *
 * Left-aligned typography, HUD framing elements (brackets, crosshairs),
 * functional buttons, and an interactive Three.js globe with spill markers.
 */
export function HeroSection({ scrollProgress = 0, onRunDetection, activeSpill, onHudClose }) {
  // Fade out over scroll
  const contentOpacity = Math.max(0, 1 - scrollProgress * 1.5)
  const contentY = scrollProgress * -80

  const scrollToDashboard = () => {
    document.getElementById('dashboard-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ height: '300vh', position: 'relative', zIndex: 1 }}>
      <section
        id="hero-section"
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '40px',
          pointerEvents: 'none',
        }}
      >


        {/* ── HUD Framing Overlay (Fades on scroll) ── */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: contentOpacity,
            transition: 'opacity 0.1s linear',
            zIndex: 5,
          }}
        >
          {/* Scanline overlay (right side bleed) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(57,255,106,0.03) 2px, rgba(57,255,106,0.03) 4px)',
              maskImage: 'linear-gradient(to right, transparent 30%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 30%, black 100%)',
            }}
          />

          {/* Corner brackets */}
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <path d="M 40 60 L 40 40 L 60 40" fill="none" stroke="var(--phosphor)" strokeWidth="1.5" strokeOpacity="0.5" />
            <path d="M calc(100% - 40px) 60 L calc(100% - 40px) 40 L calc(100% - 60px) 40" fill="none" stroke="var(--phosphor)" strokeWidth="1.5" strokeOpacity="0.5" />
            <path d="M 40 calc(100% - 60px) L 40 calc(100% - 40px) L 60 calc(100% - 40px)" fill="none" stroke="var(--phosphor)" strokeWidth="1.5" strokeOpacity="0.5" />
            <path d="M calc(100% - 40px) calc(100% - 60px) L calc(100% - 40px) calc(100% - 40px) L calc(100% - 60px) calc(100% - 40px)" fill="none" stroke="var(--phosphor)" strokeWidth="1.5" strokeOpacity="0.5" />

            {/* Crosshair/reticle (shifted right for globe focal point) */}
            <circle cx="70%" cy="50%" r="120" fill="none" stroke="var(--phosphor)" strokeWidth="1" strokeOpacity="0.1" strokeDasharray="4 6" />
            <circle cx="70%" cy="50%" r="40" fill="none" stroke="var(--phosphor)" strokeWidth="1" strokeOpacity="0.2" />
            <line x1="70%" y1="calc(50% - 50px)" x2="70%" y2="calc(50% - 8px)" stroke="var(--phosphor)" strokeWidth="1.5" strokeOpacity="0.6" />
            <line x1="70%" y1="calc(50% + 8px)" x2="70%" y2="calc(50% + 50px)" stroke="var(--phosphor)" strokeWidth="1.5" strokeOpacity="0.6" />
            <line x1="calc(70% - 50px)" y1="50%" x2="calc(70% - 8px)" y2="50%" stroke="var(--phosphor)" strokeWidth="1.5" strokeOpacity="0.6" />
            <line x1="calc(70% + 8px)" y1="50%" x2="calc(70% + 50px)" y2="50%" stroke="var(--phosphor)" strokeWidth="1.5" strokeOpacity="0.6" />

            {/* Edge tick marks (bottom left scale) */}
            <g stroke="var(--phosphor)" strokeOpacity="0.3" strokeWidth="1">
              {[...Array(20)].map((_, i) => (
                <line key={i} x1="40" y1={Math.max(40, window.innerHeight - 80 - (i * 15))} x2={i % 5 === 0 ? "55" : "48"} y2={Math.max(40, window.innerHeight - 80 - (i * 15))} />
              ))}
            </g>
          </svg>
        </div>

        {/* ── Left-aligned Hero content ── */}
        <div
          className="relative flex flex-col items-start gap-8 px-4 sm:px-12 md:px-24"
          style={{
            zIndex: 10,
            maxWidth: '900px',
            opacity: contentOpacity,
            transform: `translateY(${contentY}px)`,
            willChange: 'opacity, transform',
            pointerEvents: 'none',
          }}
        >
          {/* Wordmark */}
          <div className="flex flex-col">
            <h1
              className="font-bold"
              style={{
                fontFamily: 'var(--font-tech)',
                fontSize: 'clamp(3.5rem, 8vw, 6rem)',
                lineHeight: 1,
                letterSpacing: '0.1em', // wide tracking
                color: 'var(--bone)',
                textShadow: '0 0 40px rgba(255,255,255,0.1)',
                marginLeft: '-0.05em', // optical alignment
              }}
            >
              TRITON
              <br />
              <span
                style={{
                  color: 'var(--phosphor)',
                  textShadow: '0 0 20px rgba(57,255,106,0.4)',
                }}
              >
                WATCH
              </span>
            </h1>
          </div>

          {/* System description (shortened, left aligned) */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--bone)',
              opacity: 0.7,
              fontSize: '1rem',
              lineHeight: 1.6,
              maxWidth: '380px',
              borderLeft: '2px solid rgba(57,255,106,0.3)',
              paddingLeft: '16px',
            }}
          >
            SAR × AIS correlation engine.<br />
            Positive polluter ID &lt; 3s.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-8 mt-4" style={{ pointerEvents: contentOpacity > 0.1 ? 'auto' : 'none' }}>
            <button
              id="btn-run-detection"
              onClick={() => {
                onRunDetection?.()
                scrollToDashboard()
              }}
              className="group flex items-center justify-center gap-3 px-6 py-3 transition-all duration-200"
              style={{
                background: 'rgba(57,255,106,0.1)',
                border: '1px solid var(--phosphor)',
                color: 'var(--phosphor)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)',
                boxShadow: 'inset 0 0 20px rgba(57,255,106,0)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(57,255,106,0.2)'
                e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(57,255,106,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(57,255,106,0.1)'
                e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(57,255,106,0)'
              }}
            >
              <span className="w-1.5 h-1.5 bg-phosphor rounded-full animate-[status-blink_1.5s_ease-in-out_infinite]" style={{ boxShadow: 'var(--glow-green)' }} />
              [ RUN LIVE DETECTION ]
            </button>

            <button
              id="btn-view-architecture"
              onClick={scrollToDashboard}
              className="flex items-center gap-2 transition-all duration-200"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--bone)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                opacity: 0.6,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
              view dashboard &rarr;
            </button>
          </div>
        </div>

        {/* ── Spill HUD Overlay (appears on marker hover/select) ── */}
        {activeSpill && (
          <SpillHudOverlay
            spill={activeSpill}
            onClose={onHudClose}
          />
        )}
      </section>
    </div>
  )
}
