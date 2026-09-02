import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ── Severity badge colors ──────────────────────────────────────────────────────
const SEV_COLORS = {
  CRITICAL: { bg: 'rgba(255,45,107,0.15)', border: 'rgba(255,45,107,0.4)', text: '#FF2D6B' },
  HIGH:     { bg: 'rgba(255,176,0,0.12)',  border: 'rgba(255,176,0,0.35)', text: '#FFB000' },
  MEDIUM:   { bg: 'rgba(0,163,255,0.10)',  border: 'rgba(0,163,255,0.3)',  text: '#00A3FF' },
  LOW:      { bg: 'rgba(0,163,255,0.06)',  border: 'rgba(0,163,255,0.2)',  text: '#00A3FF' },
}

// ── Section definitions ────────────────────────────────────────────────────────
const SECTIONS = ['DETECT', 'CORRELATE', 'REPORT']

/**
 * SpillHudOverlay — two-panel cyberpunk HUD overlay.
 *
 * Left panel: scroll-driven field reveal with spill detail data.
 * Right panel: static tab indicator that syncs with left panel scroll position.
 */
export function SpillHudOverlay({ spill, onClose }) {
  const [activeSection, setActiveSection] = useState(0)
  const [isClosing, setIsClosing] = useState(false)
  const [revealedFields, setRevealedFields] = useState(0)
  const scrollRef = useRef(null)
  const sectionRefs = useRef([])
  const overlayRef = useRef(null)

  // ── Build field list for the left panel ──────────────────────────────────
  const fields = useMemo(() => {
    if (!spill) return []
    const suspect = spill.nearbyVessels?.find(v => v.isSuspect) ?? spill.nearbyVessels?.[0]
    return [
      // DETECT section
      { section: 0, type: 'header', label: '01 / DETECT' },
      { section: 0, type: 'field', key: 'SPILL ID', value: spill.name },
      { section: 0, type: 'field', key: 'COORDINATES', value: `${spill.lat.toFixed(2)}°${spill.lat >= 0 ? 'N' : 'S'} · ${Math.abs(spill.lon).toFixed(2)}°${spill.lon >= 0 ? 'E' : 'W'}` },
      { section: 0, type: 'field', key: 'CONFIDENCE', value: `${(spill.confidence * 100).toFixed(1)}%` },
      { section: 0, type: 'field', key: 'AREA', value: `~${spill.areaKm2} km²` },
      { section: 0, type: 'field', key: 'SAR SCENE', value: spill.sarScene },
      { section: 0, type: 'field', key: 'PASS', value: spill.pass },
      { section: 0, type: 'field', key: 'RESOLUTION', value: spill.resolution },
      { section: 0, type: 'field', key: 'MODEL', value: spill.model },
      { section: 0, type: 'field', key: 'IOU', value: spill.iou.toFixed(3) },
      { section: 0, type: 'field', key: 'TIMESTAMP', value: new Date(spill.timestamp).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' },
      { section: 0, type: 'severity', severity: spill.severity },
      { section: 0, type: 'divider' },

      // CORRELATE section
      { section: 1, type: 'header', label: '02 / CORRELATE' },
      { section: 1, type: 'field', key: 'VESSELS IN RANGE', value: `${spill.nearbyVessels?.length ?? 0}` },
      ...(spill.nearbyVessels ?? []).map((v, i) => ({
        section: 1,
        type: 'vessel',
        vessel: v,
        rank: i + 1,
      })),
      { section: 1, type: 'divider' },

      // REPORT section
      { section: 2, type: 'header', label: '03 / REPORT' },
      { section: 2, type: 'field', key: 'TOP SUSPECT', value: suspect?.name ?? 'N/A' },
      { section: 2, type: 'field', key: 'SCORE', value: suspect ? `${suspect.score}/100` : 'N/A' },
      { section: 2, type: 'field', key: 'DISTANCE', value: suspect ? `${suspect.distance.toFixed(1)} nm` : 'N/A' },
      { section: 2, type: 'field', key: 'TIME GAP', value: suspect ? `${suspect.timeGap}h` : 'N/A' },
      { section: 2, type: 'field', key: 'AIS BLACKOUT', value: suspect ? `${(1.2 + suspect.score * 0.03).toFixed(1)}h` : 'N/A' },
      { section: 2, type: 'summary', text: spill.reportSummary },
      { section: 2, type: 'field', key: 'STATUS', value: 'MRCC ALERT QUEUED' },
    ]
  }, [spill])

  // ── Progressive reveal driven by timers ──────────────────────────────────
  const spillId = spill?.id
  const revealTimers = useRef([])
  useEffect(() => {
    // Clear any old timers
    revealTimers.current.forEach(clearTimeout)
    revealTimers.current = []
    if (!spillId || fields.length === 0) return
    // Schedule each field reveal
    for (let i = 0; i < fields.length; i++) {
      const id = setTimeout(() => setRevealedFields(i + 1), 300 + i * 80)
      revealTimers.current.push(id)
    }
    return () => {
      revealTimers.current.forEach(clearTimeout)
      revealTimers.current = []
    }
  }, [spillId, fields.length])

  // ── Scroll-driven section sync ───────────────────────────────────────────
  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollTop = el.scrollTop
    const scrollH = el.scrollHeight - el.clientHeight
    if (scrollH <= 0) { setActiveSection(0); return }
    const pct = scrollTop / scrollH
    if (pct < 0.33) setActiveSection(0)
    else if (pct < 0.66) setActiveSection(1)
    else setActiveSection(2)
  }, [])

  // ── Capture wheel events to prevent page scroll ──────────────────────────
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const handler = (e) => {
      // Only prevent if inside the scroll panel
      const scrollEl = scrollRef.current
      if (scrollEl && scrollEl.contains(e.target)) {
        e.stopPropagation()
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // ── Close handler ────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose?.()
    }, 350)
  }, [onClose])

  if (!spill) return null

  return (
    <div
      ref={overlayRef}
      id="spill-hud-overlay"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '640px',
        maxWidth: '90vw',
        display: 'flex',
        gap: '1px',
        zIndex: 20,
        pointerEvents: 'auto',
        animation: isClosing
          ? 'hud-slide-out 0.35s ease-in forwards'
          : 'hud-slide-in 0.4s ease-out both',
        padding: '60px 24px 60px 0',
      }}
    >
      {/* ── LEFT PANEL: Dynamic content ──────────────────────────────────── */}
      <div
        className="hud-panel hud-panel-inner"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <div className="hud-scanlines" aria-hidden="true" />

        {/* Panel header */}
        <div style={{ padding: '16px 20px 12px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontFamily: 'var(--font-hud)',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                color: 'var(--phosphor)',
              }}
            >
              SPILL INTEL · {spill.name}
            </span>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: SEV_COLORS[spill.severity]?.text ?? 'var(--phosphor)',
                boxShadow: `0 0 8px ${SEV_COLORS[spill.severity]?.text ?? 'var(--phosphor)'}`,
                animation: 'status-blink 1.5s ease-in-out infinite',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--bone)',
              opacity: 0.3,
              letterSpacing: '0.06em',
            }}
          >
            {spill.id} · {new Date(spill.timestamp).toISOString().slice(0, 10)}
          </span>
        </div>

        <div className="hud-divider" />

        {/* Scrollable field list */}
        <div
          ref={scrollRef}
          className="hud-scroll"
          onScroll={onScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '12px 20px 20px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {fields.map((field, i) => {
            const isRevealed = i < revealedFields
            const baseStyle = {
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }

            // Assign section ref for scroll tracking
            const refCallback = (el) => {
              if (field.type === 'header') {
                sectionRefs.current[field.section] = el
              }
            }

            switch (field.type) {
              case 'header':
                return (
                  <div
                    key={`h-${field.label}`}
                    ref={refCallback}
                    style={{
                      ...baseStyle,
                      fontFamily: 'var(--font-hud)',
                      fontSize: '12px',
                      fontWeight: 500,
                      letterSpacing: '0.15em',
                      color: 'var(--phosphor)',
                      opacity: isRevealed ? 0.6 : 0,
                      marginTop: field.section > 0 ? '20px' : '4px',
                      marginBottom: '10px',
                    }}
                  >
                    {field.label}
                  </div>
                )

              case 'field':
                return (
                  <div key={`f-${field.key}-${field.section}`} className="hud-field" style={baseStyle}>
                    <span className="hud-field-key">{field.key}</span>
                    <span className="hud-field-val">{field.value}</span>
                  </div>
                )

              case 'severity':
                const sev = SEV_COLORS[field.severity] ?? SEV_COLORS.LOW
                return (
                  <div key="severity" style={{ ...baseStyle, marginTop: '8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontFamily: 'var(--font-hud)',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        color: sev.text,
                        background: sev.bg,
                        border: `1px solid ${sev.border}`,
                        borderRadius: '4px',
                      }}
                    >
                      ◈ {field.severity}
                    </span>
                  </div>
                )

              case 'divider':
                return (
                  <div key={`d-${i}`} className="hud-divider" style={{ ...baseStyle, margin: '14px 0' }} />
                )

              case 'vessel':
                const v = field.vessel
                const isTop = v.isSuspect
                return (
                  <div
                    key={`v-${v.id}`}
                    style={{
                      ...baseStyle,
                      padding: '10px 12px',
                      marginBottom: '6px',
                      background: isTop ? 'rgba(255,176,0,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isTop ? 'rgba(255,176,0,0.2)' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: '18px',
                            color: isTop ? 'var(--amber)' : 'var(--bone)',
                            opacity: isTop ? 1 : 0.4,
                            lineHeight: 1,
                          }}
                        >
                          {String(field.rank).padStart(2, '0')}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-hud)',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: isTop ? 'var(--amber)' : 'var(--bone)',
                            opacity: isTop ? 1 : 0.7,
                          }}
                        >
                          {v.name}
                        </span>
                      </div>
                      {isTop && (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            padding: '3px 8px',
                            background: 'rgba(255,176,0,0.15)',
                            color: 'var(--amber)',
                            border: '1px solid rgba(255,176,0,0.35)',
                            borderRadius: '3px',
                            letterSpacing: '0.08em',
                          }}
                        >
                          SUSPECT
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {[
                        { k: 'DIST', v: `${v.distance}nm` },
                        { k: 'HDG', v: `${v.heading}°` },
                        { k: 'SPD', v: `${v.speed}kn` },
                        { k: 'SCORE', v: `${v.score}` },
                        { k: 'GAP', v: `${v.timeGap}h` },
                      ].map(item => (
                        <div key={item.k} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--bone)', opacity: 0.3, letterSpacing: '0.06em' }}>{item.k}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--bone)', opacity: 0.8 }}>{item.v}</span>
                        </div>
                      ))}
                    </div>
                    {/* Score bar */}
                    <div style={{ marginTop: '8px', height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '1px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: isRevealed ? `${v.score}%` : '0%',
                          height: '100%',
                          background: isTop
                            ? 'linear-gradient(90deg, #FFB000, #FFB00066)'
                            : 'linear-gradient(90deg, var(--phosphor), rgba(0,163,255,0.4))',
                          borderRadius: '1px',
                          transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                        }}
                      />
                    </div>
                  </div>
                )

              case 'summary':
                return (
                  <div key="summary" style={{ ...baseStyle, marginTop: '8px' }}>
                    <p
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        color: 'var(--bone)',
                        opacity: 0.55,
                        padding: '10px 12px',
                        background: 'rgba(0,163,255,0.04)',
                        border: '1px solid rgba(0,163,255,0.1)',
                        borderRadius: '6px',
                        borderLeft: '2px solid var(--phosphor)',
                      }}
                    >
                      {field.text}
                    </p>
                  </div>
                )

              default:
                return null
            }
          })}

          {/* Bottom spacer */}
          <div style={{ height: '40px' }} />
        </div>

        {/* Close button */}
        <div style={{ padding: '8px 20px 12px', position: 'relative', zIndex: 2 }}>
          <button
            onClick={handleClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '8px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--bone)',
              opacity: 0.5,
              letterSpacing: '0.06em',
              transition: 'opacity 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.borderColor = 'rgba(0,163,255,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            ✕ CLOSE INTEL
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL: Static tab indicator ────────────────────────────── */}
      <div
        className="hud-panel hud-panel-inner hidden sm:flex flex-col flex-shrink-0"
        style={{
          width: '180px',
        }}
      >
        <div className="hud-scanlines" aria-hidden="true" />

        {/* Right panel header */}
        <div style={{ padding: '16px 14px 12px', position: 'relative', zIndex: 2 }}>
          <span
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '16px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              color: 'var(--phosphor)',
              opacity: 0.5,
            }}
          >
            PIPELINE
          </span>
        </div>

        <div className="hud-divider" />

        {/* Tab list */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '12px 0',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {SECTIONS.map((label, i) => {
            const isActive = i === activeSection
            const isPast = i < activeSection
            return (
              <button
                key={label}
                onClick={() => {
                  setActiveSection(i)
                  // Scroll the left panel to the section
                  const headerEl = sectionRefs.current[i]
                  if (headerEl && scrollRef.current) {
                    scrollRef.current.scrollTo({
                      top: headerEl.offsetTop - 16,
                      behavior: 'smooth'
                    })
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 14px',
                  background: isActive ? 'rgba(0,163,255,0.08)' : 'transparent',
                  border: 'none',
                  borderLeft: isActive
                    ? '2px solid var(--phosphor)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Status dot */}
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: isActive
                      ? 'var(--phosphor)'
                      : isPast ? 'var(--phosphor)' : 'rgba(255,255,255,0.15)',
                    boxShadow: isActive ? '0 0 8px var(--phosphor)' : 'none',
                    flexShrink: 0,
                    transition: 'all 0.3s ease',
                  }}
                />
                {/* Label */}
                <span
                  style={{
                    fontFamily: 'var(--font-hud)',
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 400,
                    letterSpacing: '0.1em',
                    color: isActive
                      ? 'var(--phosphor)'
                      : isPast ? 'var(--bone)' : 'var(--bone)',
                    opacity: isActive ? 1 : isPast ? 0.5 : 0.3,
                    transition: 'all 0.3s ease',
                    textAlign: 'left',
                  }}
                >
                  {label}
                </span>
                {/* Active indicator arrow */}
                {isActive && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--phosphor)',
                      opacity: 0.6,
                    }}
                  >
                    ◂
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tick marks at the bottom */}
        <div style={{ padding: '0 14px 16px', position: 'relative', zIndex: 2 }}>
          <div className="hud-divider" style={{ marginBottom: '10px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: '1px',
                  height: i % 4 === 0 ? '8px' : '4px',
                  background: 'var(--phosphor)',
                  opacity: 0.2,
                }}
              />
            ))}
          </div>
          <span
            style={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--bone)',
              opacity: 0.2,
              marginTop: '6px',
              letterSpacing: '0.04em',
            }}
          >
            TRITON v0.9.1
          </span>
        </div>
      </div>
    </div>
  )
}
