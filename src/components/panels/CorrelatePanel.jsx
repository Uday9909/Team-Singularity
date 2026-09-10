import { useState, useRef } from 'react'
import { INITIAL_VESSELS } from '../../data/demo'

// Colour driven by correlation score
function scoreTheme(score) {
  if (score >= 75) return { accent: 'var(--amber)', bar: '#FFB000', dim: 'rgba(255,176,0,0.12)', border: 'rgba(255,176,0,0.3)' }
  if (score >= 50) return { accent: '#C4CF28', bar: '#C4CF28', dim: 'rgba(196,207,40,0.08)', border: 'rgba(196,207,40,0.2)' }
  return { accent: 'var(--phosphor)', bar: 'var(--phosphor)', dim: 'rgba(57,255,106,0.06)', border: 'rgba(57,255,106,0.15)' }
}

function VesselCard({ vessel, rank, isSelected, onClick, scoreRef }) {
  const theme = scoreTheme(vessel.score)
  return (
    <button
      id={`vessel-card-${vessel.id}`}
      onClick={onClick}
      className="w-full text-left rounded-xl transition-all duration-200"
      style={{
        padding: '18px 20px',
        background: isSelected ? theme.dim : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isSelected ? theme.border : 'rgba(255,255,255,0.05)'}`,
        cursor: 'pointer',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex items-center gap-4">
        {/* Rank number */}
        <span
          className="font-display font-bold flex-shrink-0"
          style={{ fontSize: '1.5rem', color: theme.accent, opacity: 0.5, minWidth: '28px', lineHeight: 1 }}
        >
          {rank}
        </span>

        {/* Vessel info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-semibold text-sm truncate" style={{ color: theme.accent }}>
              {vessel.name}
            </span>
            {vessel.isSuspect && (
              <span
                className="font-mono text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,176,0,0.15)', color: 'var(--amber)', border: '1px solid rgba(255,176,0,0.35)', fontSize: '9px', letterSpacing: '0.08em' }}
              >
                TOP MATCH
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.4 }}>{vessel.type}</span>
            <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.28 }}>{vessel.distance.toFixed(1)} nm · {vessel.timeGap}h gap</span>
          </div>
          {/* Score bar */}
          <div className="score-bar-track" style={{ marginTop: '10px' }}>
            <div className="score-bar-fill" style={{ width: `${vessel.score}%`, background: `linear-gradient(90deg, ${theme.bar}, ${theme.bar}66)` }} />
          </div>
        </div>

        {/* Score */}
        <div className="flex-shrink-0 text-right">
          <span
            ref={isSelected ? scoreRef : undefined}
            className="font-display font-bold"
            style={{ fontSize: '2.2rem', color: theme.accent, lineHeight: 1, textShadow: vessel.isSuspect ? '0 0 20px rgba(255,176,0,0.35)' : 'none' }}
          >
            {vessel.score}
          </span>
          <div className="font-mono" style={{ fontSize: '9px', color: 'var(--bone)', opacity: 0.35, marginTop: '2px' }}>/100</div>
        </div>
      </div>
    </button>
  )
}

export function CorrelatePanel({ selectedVesselId, onVesselSelect, revealed }) {
  const [selected, setSelected] = useState(INITIAL_VESSELS[0].id)
  const scoreRef = useRef(null)
  const prevScore = useRef(null)

  const handleSelect = async (vessel) => {
    setSelected(vessel.id)
    onVesselSelect?.(vessel.id)

    if (scoreRef.current) {
      const { animate } = await import('animejs')
      const obj = { v: prevScore.current ?? 0 }
      prevScore.current = vessel.score
      animate(obj, {
        v: vessel.score, duration: 800, ease: 'outExpo',
        onUpdate: () => { if (scoreRef.current) scoreRef.current.textContent = Math.round(obj.v) },
      })
    }
  }

  const selVessel = INITIAL_VESSELS.find(v => v.id === (selectedVesselId || selected))
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <div className="glass-panel flex flex-col relative overflow-hidden" style={{ padding: '32px', gap: '24px', height: '100%' }}>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--phosphor)', opacity: 0.6 }}>02 / CORRELATE</span>
        <h2 className="font-display font-semibold" style={{ fontSize: '1.35rem', color: 'var(--bone)', letterSpacing: '-0.01em' }}>
          Vessel Ranking
        </h2>
      </div>

      <div className="section-divider" />

      {!revealed ? (
        <div className="flex flex-col items-center justify-center text-center gap-3 h-full" style={{ padding: '40px 20px' }}>
          <span style={{ fontSize: '24px', opacity: 0.2 }}>⚓</span>
          <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.4, lineHeight: 1.6 }}>
            Awaiting SAR detection data<br />to correlate vessel proximity.
          </span>
        </div>
      ) : (
        <>
          {/* Vessel cards */}
          <div className="flex flex-col gap-2">
        {INITIAL_VESSELS.map((v, i) => (
          <VesselCard
            key={v.id}
            vessel={v}
            rank={String(i + 1).padStart(2, '0')}
            isSelected={(selectedVesselId || selected) === v.id}
            onClick={() => handleSelect(v)}
            scoreRef={scoreRef}
          />
        ))}
      </div>

      {/* Why this vessel detail */}
      {selVessel && (
        <div className="mt-auto">
          <div className="section-divider" style={{ marginBottom: '16px' }} />
          <button
            id="btn-why-vessel"
            onClick={() => setDetailOpen(d => !d)}
            className="flex items-center justify-between w-full"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span className="font-mono text-xs" style={{ color: 'var(--phosphor)', opacity: 0.6 }}>Why this vessel?</span>
            <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.3 }}>{detailOpen ? '▲' : '▼'}</span>
          </button>
          {detailOpen && (
            <div className="flex flex-col gap-2.5" style={{ marginTop: '14px' }}>
              {[
                { k: 'Bearing from spill', v: `${210 + Math.round(selVessel.heading % 30)}°` },
                { k: 'Speed at detection', v: `${selVessel.speed} kn` },
                { k: 'Time window', v: `±${Math.round(selVessel.timeGap * 60)} min` },
                { k: 'AIS blackout', v: `${(1.2 + selVessel.score * 0.03).toFixed(1)} h` },
                { k: 'Flag state risk', v: selVessel.flag === 'PA' ? 'Medium' : 'Low' },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between">
                  <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.38 }}>{k}</span>
                  <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.8 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  )
}
