import { StatusDot } from '../ui'

/**
 * Hero section — text overlay only.
 *
 * The globe/map is handled by `GlobeMapView` (fixed behind everything).
 * This component renders the hero text inside a 300vh scroll-driver wrapper
 * with a 100vh sticky inner.  `scrollProgress` (0→1, fed by App) controls
 * fade-out of the text and the atmosphere vignette.
 */
export function HeroSection({ scrollProgress = 0, onRunDetection }) {
  // Hero text fades out in the first ~33% of scroll progress
  const contentOpacity = Math.max(0, 1 - scrollProgress * 3)
  const contentY = scrollProgress * -60

  // Scroll-down caret disappears almost immediately
  const scrollIndicatorOpacity = Math.max(0, 1 - scrollProgress * 8)

  const scrollToDashboard = () => {
    document.getElementById('dashboard-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    /* 300vh wrapper → 200vh of scroll distance for the globe zoom */
    <div style={{ height: '300vh', position: 'relative', zIndex: 1 }}>
      <section
        id="hero-section"
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          paddingTop: '44px',
          /* transparent — the fixed GlobeMapView shows through */
        }}
      >
        {/* ── Atmosphere vignette — dark frame around globe, fades on zoom ── */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 0%, rgba(11,15,10,0.25) 55%, rgba(11,15,10,0.82) 80%, #0B0F0A 100%)',
            pointerEvents: 'none',
            opacity: Math.max(0, 1 - scrollProgress * 1.8),
            transition: 'opacity 0.05s linear',
          }}
        />

        {/* ── Hero content ── */}
        <div
          className="relative flex flex-col items-center text-center gap-7 px-6"
          style={{
            zIndex: 10,
            maxWidth: '700px',
            opacity: contentOpacity,
            transform: `translateY(${contentY}px)`,
            willChange: 'opacity, transform',
            pointerEvents: contentOpacity > 0.1 ? 'auto' : 'none',
          }}
        >
          {/* Eyebrow chip */}
          <div
            className="flex items-center gap-2.5 px-4 py-1.5 rounded-full"
            style={{
              background: 'rgba(57,255,106,0.07)',
              border: '1px solid rgba(57,255,106,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <StatusDot live size={6} />
            <span
              className="font-mono text-xs tracking-widest uppercase"
              style={{ color: 'var(--phosphor)', opacity: 0.85, letterSpacing: '0.18em' }}
            >
              SAR · AIS · Live — SIH26143
            </span>
          </div>

          {/* Main headline */}
          <h1
            className="font-display font-bold"
            style={{
              fontSize: 'clamp(3.5rem, 12vw, 8rem)',
              lineHeight: 0.92,
              letterSpacing: '-0.03em',
              color: 'var(--bone)',
            }}
          >
            TRITON
            <br />
            <span
              style={{
                color: 'var(--phosphor)',
                textShadow:
                  '0 0 40px rgba(57,255,106,0.5), 0 0 100px rgba(57,255,106,0.2)',
              }}
            >
              WATCH
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="font-sans"
            style={{
              color: 'var(--bone)',
              opacity: 0.6,
              fontSize: '1.1rem',
              lineHeight: 1.65,
              maxWidth: '440px',
            }}
          >
            SAR satellite oil-spill detection correlated with live AIS vessel tracking.
            Identify the polluter in under 3 seconds.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              id="btn-run-detection"
              onClick={() => {
                onRunDetection?.()
                scrollToDashboard()
              }}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-display font-semibold text-sm transition-all duration-200"
              style={{
                background: 'var(--phosphor)',
                color: 'var(--void)',
                boxShadow: 'var(--glow-blue)',
                border: 'none',
                cursor: 'pointer',
                minWidth: '210px',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--glow-blue-lg)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--glow-blue)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              ▶&ensp;Run Live Detection
            </button>

            <button
              id="btn-view-architecture"
              onClick={scrollToDashboard}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-display font-semibold text-sm transition-all duration-200"
              style={{
                background: 'rgba(232,240,228,0.05)',
                color: 'var(--bone)',
                border: '1px solid rgba(232,240,228,0.15)',
                cursor: 'pointer',
                minWidth: '210px',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(232,240,228,0.4)'
                e.currentTarget.style.background = 'rgba(232,240,228,0.09)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(232,240,228,0.15)'
                e.currentTarget.style.background = 'rgba(232,240,228,0.05)'
              }}
            >
              View Dashboard ↓
            </button>
          </div>
        </div>

        {/* ── Scroll indicator ── */}
        <div
          className="absolute bottom-8 left-1/2 flex flex-col items-center gap-2"
          style={{
            transform: 'translateX(-50%)',
            opacity: scrollIndicatorOpacity,
            transition: 'opacity 0.1s',
          }}
        >
          <span
            className="font-mono text-xs tracking-widest"
            style={{ color: 'var(--bone)', opacity: 0.28 }}
          >
            SCROLL
          </span>
          <svg width="14" height="18" viewBox="0 0 14 18" fill="none" style={{ opacity: 0.28 }}>
            <path
              d="M7 1v12M1 8l6 6 6-6"
              stroke="var(--phosphor)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </section>
    </div>
  )
}
