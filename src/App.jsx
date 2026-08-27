import { useState, useEffect } from 'react'
import { TopBar } from './components/layout/TopBar'
import { Footer } from './components/layout/Footer'
import { HeroSection } from './components/hero/HeroSection'
import { GlobeMapView } from './components/hero/GlobeMapView'
import { DetectPanel } from './components/panels/DetectPanel'
import { CorrelatePanel } from './components/panels/CorrelatePanel'
import { ReportPanel } from './components/panels/ReportPanel'
import { StatusDot } from './components/ui'
import './index.css'

export default function App() {
  const [selectedVesselId, setSelectedVesselId] = useState(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [uiReady, setUiReady] = useState(false)
  const [hoveredSpill, setHoveredSpill] = useState(null)
  const [selectedSpill, setSelectedSpill] = useState(null)
  const [hasDetectionData, setHasDetectionData] = useState(false)

  const activeSpill = selectedSpill || hoveredSpill

  // ── Delay UI fade-in to allow map to construct (1 second) ──────────────
  useEffect(() => {
    const t = setTimeout(() => setUiReady(true), 1200)
    return () => clearTimeout(t)
  }, [])

  // ── Scroll-progress state (drives globe zoom + hero fade) ──────────────
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    const onScroll = () => {
      // 200vh of scroll distance for the globe animation
      const scrollDistance = window.innerHeight * 2
      setScrollProgress(Math.min(window.scrollY / scrollDistance, 1))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div id="app-root" style={{ minHeight: '100vh', background: 'var(--void)' }}>
      {/* ── Fixed map: globe → Gulf of Mexico, always behind content ──── */}
      <GlobeMapView
        scrollProgress={scrollProgress}
        onVesselSelect={setSelectedVesselId}
        selectedVesselId={selectedVesselId}
        onSpillHover={setHoveredSpill}
        onSpillSelect={setSelectedSpill}
        hasDetectionData={hasDetectionData}
      />

      {/* ── UI Layer: Fades in after map finishes loading ──── */}
      <div
        style={{
          opacity: uiReady ? 1 : 0,
          transition: 'opacity 1.5s ease-in-out',
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <TopBar />
        </div>

        {/* ── Hero: text overlay that fades on scroll ───────────────────── */}
        <HeroSection
          scrollProgress={scrollProgress}
          activeSpill={activeSpill}
          onHudClose={() => {
            setSelectedSpill(null)
            setHoveredSpill(null)
          }}
          onRunDetection={() => {
            document.getElementById('dashboard-section')?.scrollIntoView({ behavior: 'smooth' })
          }}
        />

        {/* ══════════════════════════════════════════════════════════════════
          DASHBOARD SECTION — panels overlaid on the (now zoomed) map
          ══════════════════════════════════════════════════════════════════ */}
        <section
          id="dashboard-section"
          style={{
            position: 'relative',
            minHeight: '100vh',
            zIndex: 1,
            pointerEvents: 'none', // let events pass through to the fixed map
          }}
        >
          {/* ── Dark overlay for panel readability ── */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              background:
                'linear-gradient(180deg, rgba(11,15,10,0.20) 0%, rgba(11,15,10,0.15) 40%, rgba(11,15,10,0.30) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* ── Horizontal scan line across the map ── */}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden', pointerEvents: 'none' }}>
            <div className="dashboard-scan-line" style={{ top: '35%' }} />
          </div>

          {/* ── Dashboard UI ── */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: 'clamp(80px, 8vw, 100px) clamp(20px, 4vw, 60px) 60px',
              display: 'flex',
              flexDirection: 'column',
              gap: '40px',
              minHeight: '100vh',
              pointerEvents: 'none',
            }}
          >
            {/* Dashboard header row */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6" style={{ pointerEvents: 'auto' }}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <StatusDot live size={7} />
                  <span
                    className="font-display font-semibold"
                    style={{ fontSize: '1.25rem', color: 'var(--bone)', letterSpacing: '-0.01em' }}
                  >
                    Live Tracking — Gulf of Mexico
                  </span>
                </div>
                <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.35 }}>
                  Sector GOM-7 · {new Date().toISOString().slice(0, 10)} UTC
                </span>
              </div>

              {/* Global Platform Metrics - Compact */}
              <div className="flex items-center gap-6 px-6 py-3 rounded-xl glass-panel" style={{ padding: '16px 24px', background: 'rgba(11,15,10,0.65)' }}>
                {[
                  { label: 'IOU SCORE', val: '0.847' },
                  { label: 'VESSELS', val: '5' },
                  { label: 'LATENCY', val: '2.3s' }
                ].map((m, i) => (
                  <div key={m.label} className="flex flex-col" style={{ paddingRight: i < 2 ? '24px' : '0', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <span className="font-mono text-[10px] tracking-widest text-bone opacity-40 mb-1">{m.label}</span>
                    <span className="font-display font-bold text-phosphor text-xl leading-none" style={{ textShadow: '0 0 12px rgba(57,255,106,0.4)' }}>
                      {m.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Spill alert badge */}
              <div
                className="flex items-center gap-3 px-5 py-3 rounded-xl"
                style={{
                  background: 'rgba(255,176,0,0.1)',
                  border: '1px solid rgba(255,176,0,0.35)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 0 24px rgba(255,176,0,0.1)',
                }}
              >
                <span style={{ color: 'var(--amber)', fontSize: '1.1rem' }}>⬡</span>
                <div>
                  <div className="font-display font-semibold text-sm" style={{ color: 'var(--amber)' }}>
                    SPILL ALPHA-7 DETECTED
                  </div>
                  <div className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.55 }}>
                    27.4°N · 89.1°W · Conf. 91% · ~247 km²
                  </div>
                </div>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: 'var(--amber)', boxShadow: 'var(--glow-amber)', animation: 'status-blink 1.6s infinite' }}
                />
              </div>
            </div>

            {/* ── Three panels row ── */}
            <div className="flex-1 mt-4">
              <div
                className="grid grid-cols-1 xl:grid-cols-3 gap-6"
                style={{
                  width: '100%',
                  pointerEvents: 'auto',
                }}
              >
                <DetectPanel onDetectionComplete={() => setHasDetectionData(true)} />
                <CorrelatePanel
                  selectedVesselId={selectedVesselId}
                  onVesselSelect={setSelectedVesselId}
                  hasDetectionData={hasDetectionData}
                />
                <ReportPanel 
                  selectedVesselId={selectedVesselId} 
                  hasDetectionData={hasDetectionData}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Architecture section ──────────────────────────────────────── */}
        <section
          id="architecture-section"
          style={{
            position: 'relative',
            zIndex: 1,
            padding: 'clamp(60px, 6vw, 80px) clamp(20px, 4vw, 60px)',
            borderTop: '1px solid var(--hairline)',
            background: 'var(--void)',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--phosphor)', opacity: 0.5 }}>
                System Architecture
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
            </div>

            <div className="grid gap-4 theme-panel-neutral" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {[
                { n: '01', title: 'SAR Ingestion', desc: 'Sentinel-1 GRD via Copernicus API · 10 m · IW mode · ascending pass', icon: '🛰' },
                { n: '02', title: 'Oil Detection', desc: 'YOLOv8-seg fine-tuned on SOS dataset · IoU 0.847 · 91% confidence', icon: '⬡' },
                { n: '03', title: 'AIS Correlation', desc: 'Proximity + temporal window + speed/heading + AIS blackout scoring', icon: '⚓' },
                { n: '04', title: 'Alert & Report', desc: 'Ranked suspects → jsPDF report → MRCC alert dispatch pipeline', icon: '⚑' },
              ].map(card => (
                <div key={card.n} className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs" style={{ color: 'var(--phosphor)', opacity: 0.45 }}>{card.n}</span>
                    <span style={{ fontSize: '1.3rem' }}>{card.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-base" style={{ color: 'var(--phosphor)', marginBottom: '8px' }}>
                      {card.title}
                    </h3>
                    <p className="font-sans text-sm" style={{ color: 'var(--bone)', opacity: 0.55, lineHeight: 1.6 }}>
                      {card.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tech stack */}
            <div
              className="flex flex-wrap gap-2 items-center"
              style={{ padding: '20px 24px', background: 'rgba(57,255,106,0.03)', borderRadius: '12px', border: '1px solid var(--hairline)' }}
            >
              <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.3 }}>Stack:</span>
              {['React 19', 'Vite 8', 'Tailwind CSS v4', 'MapLibre GL JS', 'anime.js v4', 'YOLOv8', 'Sentinel-1', 'jsPDF'].map(t => (
                <span key={t} className="font-mono text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(57,255,106,0.07)', color: 'var(--phosphor)', border: '1px solid rgba(57,255,106,0.15)' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div style={{ pointerEvents: 'auto' }}>
          <Footer />
        </div>
      </div>
    </div>
  )
}
