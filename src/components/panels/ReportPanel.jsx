import { useState } from 'react'
import { INITIAL_VESSELS } from '../../data/demo'
import { jsPDF } from 'jspdf'

export function ReportPanel({ selectedVesselId }) {
  const [generating, setGenerating] = useState(false)
  const [lastReport, setLastReport] = useState(null)
  const [msg, setMsg] = useState(null)

  const suspect = INITIAL_VESSELS.find(v => v.isSuspect)
  const vessel = INITIAL_VESSELS.find(v => v.id === selectedVesselId) ?? suspect

  const handlePDF = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 700))
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const ts = new Date().toISOString()

      doc.setFillColor(11, 15, 10); doc.rect(0, 0, 210, 297, 'F')
      doc.setTextColor(57, 255, 106); doc.setFontSize(22); doc.setFont('Courier', 'bold')
      doc.text('TRITON WATCH', 105, 22, { align: 'center' })
      doc.setFontSize(9); doc.setTextColor(232, 240, 228)
      doc.text('OIL SPILL DETECTION & AIS CORRELATION REPORT', 105, 29, { align: 'center' })
      doc.setDrawColor(42, 51, 44); doc.line(15, 34, 195, 34)

      doc.setFontSize(8)
      doc.setTextColor(57, 255, 106); doc.text('RPT-20260824-001', 15, 42)
      doc.setTextColor(232, 240, 228); doc.text(ts.slice(0, 19).replace('T', ' ') + ' UTC', 15, 48)

      // Spill section
      doc.setFontSize(10); doc.setTextColor(255, 176, 0); doc.text('DETECTED SPILL', 15, 60)
      doc.setDrawColor(255, 176, 0); doc.line(15, 62, 75, 62)
      const spillRows = [['ID','ALPHA-7'],['Confidence','91.0%'],['IoU','0.847'],['Area','~247 km²'],['Centre','27.4°N, 89.1°W'],['SAR Scene','S1A_IW_GRDH_20260824']]
      doc.setFontSize(8)
      spillRows.forEach(([k, v], i) => {
        doc.setTextColor(57, 255, 106); doc.text(k, 15, 70 + i * 7)
        doc.setTextColor(232, 240, 228); doc.text(v, 75, 70 + i * 7)
      })

      // Vessel section
      doc.setFontSize(10); doc.setTextColor(255, 176, 0); doc.text('TOP SUSPECT VESSEL', 15, 120)
      doc.setDrawColor(255, 176, 0); doc.line(15, 122, 95, 122)
      const vRows = [['Vessel', vessel.name], ['IMO', vessel.imo], ['Type', vessel.type], ['Flag', vessel.flag], ['Score', `${vessel.score}/100`], ['Distance', `${vessel.distance.toFixed(1)} nm`], ['Time Gap', `${vessel.timeGap} h`], ['Speed', `${vessel.speed} kn`]]
      doc.setFontSize(8)
      vRows.forEach(([k, v], i) => {
        doc.setTextColor(57, 255, 106); doc.text(k, 15, 130 + i * 7)
        doc.setTextColor(232, 240, 228); doc.text(String(v), 75, 130 + i * 7)
      })

      // Methodology
      doc.setFontSize(10); doc.setTextColor(57, 255, 106); doc.text('METHODOLOGY', 15, 200)
      doc.setDrawColor(42, 51, 44); doc.line(15, 202, 195, 202)
      doc.setFontSize(7.5); doc.setTextColor(232, 240, 228)
      const notes = [
        'Spill detection: YOLOv8-seg trained on Sentinel-1 GRD imagery (SOS dataset, IoU 0.847).',
        'Correlation: geospatial proximity + temporal AIS window matching + speed/heading analysis.',
        'Score weights: 50% proximity, 25% temporal alignment, 15% AIS anomalies, 10% flag risk.',
        'Generated for SIH 2026 demonstration. Not a legally binding report.',
      ]
      notes.forEach((line, i) => doc.text(line, 15, 210 + i * 7, { maxWidth: 180 }))

      doc.setFontSize(7); doc.setTextColor(42, 51, 44)
      doc.text('TRITON WATCH · SIH26143 · Confidential', 105, 288, { align: 'center' })

      doc.save(`triton-watch-${Date.now()}.pdf`)
      setLastReport({ ts: ts.slice(0, 19), vessel: vessel.name })
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 3000) }

  const PIPELINE = [
    { label: 'SAR Ingestion', done: true },
    { label: 'Oil Mask — YOLOv8', done: true },
    { label: 'AIS Proximity Filter', done: true },
    { label: 'Correlation Engine', done: true },
    { label: 'MRCC Alert Dispatch', done: false },
  ]

  return (
    <div className="glass-panel flex flex-col" style={{ padding: '32px', gap: '24px', height: '100%' }}>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--phosphor)', opacity: 0.6 }}>03 / REPORT</span>
        <h2 className="font-display font-semibold" style={{ fontSize: '1.35rem', color: 'var(--bone)', letterSpacing: '-0.01em' }}>
          Export & Dispatch
        </h2>
      </div>

      <div className="section-divider" />

      {/* Suspect summary */}
      <div style={{ padding: '20px', background: 'rgba(255,176,0,0.07)', border: '1px solid rgba(255,176,0,0.2)', borderRadius: '12px' }}>
        <div className="font-mono text-xs" style={{ color: 'var(--amber)', opacity: 0.7, marginBottom: '8px' }}>TOP SUSPECT</div>
        <div className="font-display font-bold" style={{ fontSize: '1.1rem', color: 'var(--amber)', marginBottom: '4px' }}>
          {vessel.name}
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.5 }}>IMO {vessel.imo}</span>
          <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.5 }}>{vessel.flag} · {vessel.type}</span>
          <span className="font-display font-bold" style={{ color: 'var(--amber)', marginLeft: 'auto' }}>{vessel.score}<span style={{ fontSize: '0.6em', opacity: 0.6 }}>/100</span></span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          id="btn-export-pdf"
          onClick={handlePDF}
          disabled={generating}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-display font-semibold text-sm transition-all duration-200"
          style={{
            background: generating ? 'rgba(57,255,106,0.1)' : 'var(--phosphor)',
            color: generating ? 'var(--phosphor)' : 'var(--void)',
            border: generating ? '1px solid rgba(57,255,106,0.3)' : 'none',
            cursor: generating ? 'wait' : 'pointer',
            boxShadow: generating ? 'none' : 'var(--glow-green)',
          }}
          onMouseEnter={e => { if (!generating) e.currentTarget.style.boxShadow = 'var(--glow-green-lg)' }}
          onMouseLeave={e => { if (!generating) e.currentTarget.style.boxShadow = 'var(--glow-green)' }}
        >
          {generating ? <><span style={{ animation: 'status-blink 0.5s infinite' }}>⬡</span> Generating…</> : <>↓ Export PDF Report</>}
        </button>

        <button id="btn-snapshot" onClick={() => flash('Dashboard snapshot saved')}
          className="w-full py-3 rounded-xl font-display font-medium text-sm transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--bone)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', opacity: 0.75 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        >
          ◻ Save Snapshot
        </button>

        <button id="btn-mrcc" onClick={() => flash('Alert queued for MRCC dispatch')}
          className="w-full py-3 rounded-xl font-display font-medium text-sm transition-all"
          style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--bone)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', opacity: 0.55 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.55' }}
        >
          ⇧ Dispatch to MRCC Portal
        </button>
      </div>

      {msg && (
        <div className="rounded-lg px-4 py-2.5 font-mono text-xs text-center" style={{ background: 'rgba(57,255,106,0.07)', color: 'var(--phosphor)', border: '1px solid rgba(57,255,106,0.2)' }}>
          {msg}
        </div>
      )}

      {lastReport && (
        <div className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.35 }}>
          Last report: {lastReport.ts} UTC · {lastReport.vessel}
        </div>
      )}

      {/* Pipeline */}
      <div className="mt-auto flex flex-col gap-3">
        <div className="section-divider" />
        <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--bone)', opacity: 0.3 }}>PIPELINE STATUS</span>
        {PIPELINE.map(({ label, done }) => (
          <div key={label} className="flex items-center gap-3">
            <span style={{ color: done ? 'var(--phosphor)' : 'rgba(255,255,255,0.15)', fontSize: '11px', flexShrink: 0 }}>
              {done ? '✓' : '○'}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: done ? 0.65 : 0.28 }}>{label}</span>
            {done && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--phosphor)', boxShadow: 'var(--glow-green)', animation: 'status-blink 2s infinite' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
