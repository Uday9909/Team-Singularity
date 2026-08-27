import { useState, useRef, useCallback } from 'react'

export function DetectPanel({ onDetectionComplete }) {
  const [isDragging, setIsDragging] = useState(false)
  const [image, setImage] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [done, setDone] = useState(false)
  const scanLineRef = useRef(null)
  const fileInputRef = useRef(null)

  const runScan = useCallback(async () => {
    setScanning(true)
    setDone(false)
    const el = scanLineRef.current
    if (el) { el.style.opacity = '1'; el.style.top = '0%' }

    const { animate } = await import('animejs')
    if (el) {
      animate(el, { top: '100%', duration: 1800, ease: 'linear' })
    }
    await new Promise(r => setTimeout(r, 2000))
    if (el) el.style.opacity = '0'
    setScanning(false)
    setDone(true)
    if (onDetectionComplete) onDetectionComplete()
  }, [onDetectionComplete])

  const handleFile = useCallback((file) => {
    if (!file?.type.match(/image\//)) return
    setImage(URL.createObjectURL(file))
    setDone(false)
    setTimeout(runScan, 300)
  }, [runScan])

  const onDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]) }
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true) }

  return (
    <div className="glass-panel flex flex-col" style={{ padding: '32px', gap: '28px', height: '100%' }}>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--phosphor)', opacity: 0.6 }}>
          01 / DETECT
        </span>
        <h2 className="font-display font-semibold" style={{ fontSize: '1.35rem', color: 'var(--bone)', letterSpacing: '-0.01em' }}>
          SAR Image Analysis
        </h2>
      </div>

      <div className="section-divider" />

      {/* Drop zone */}
      <div
        className={`drop-zone relative flex flex-col items-center justify-center gap-4 cursor-pointer select-none ${isDragging ? 'active' : ''}`}
        style={{ minHeight: '180px', padding: '28px', borderRadius: '12px' }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Drop SAR image to analyse"
        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept="image/*,.tif" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

        {image ? (
          <div className="relative w-full" style={{ height: '160px', borderRadius: '8px', overflow: 'hidden' }}>
            <img src={image} alt="SAR scene" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.4) contrast(1.25)' }} />
            {/* scan line */}
            <div ref={scanLineRef} style={{ position: 'absolute', left: 0, right: 0, top: '0%', height: '2px', background: 'linear-gradient(90deg, transparent, var(--phosphor), transparent)', boxShadow: '0 0 10px var(--phosphor)', opacity: 0, pointerEvents: 'none' }} />
            {/* spill overlay */}
            {done && (
              <div style={{ position: 'absolute', top: '28%', left: '32%', width: '38%', height: '32%', background: 'rgba(255,176,0,0.22)', border: '1.5px solid var(--amber)', borderRadius: '40% 55% 50% 45% / 50% 40% 55% 50%', boxShadow: '0 0 16px rgba(255,176,0,0.3)', animation: 'fade-up 0.4s ease-out' }} />
            )}
          </div>
        ) : (
          <>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ opacity: 0.3 }}>
              <rect x="3" y="7" width="30" height="22" rx="3" stroke="var(--phosphor)" strokeWidth="1.5" />
              <path d="M12 19l4 4 8-8" stroke="var(--phosphor)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M18 3v5" stroke="var(--phosphor)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="flex flex-col items-center gap-1">
              <span className="font-sans text-sm" style={{ color: 'var(--bone)', opacity: 0.5 }}>Drop a SAR scene here</span>
              <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.3 }}>.png · .jpg · .tif</span>
            </div>
          </>
        )}
      </div>

      {/* Detection result */}
      {done && (
        <div style={{ padding: '20px', background: 'rgba(255,176,0,0.07)', border: '1px solid rgba(255,176,0,0.25)', borderRadius: '12px' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-xs" style={{ color: 'var(--amber)', opacity: 0.8, marginBottom: '6px' }}>SPILL DETECTED</div>
              <div className="font-display font-bold" style={{ fontSize: '2.8rem', color: 'var(--amber)', lineHeight: 1, textShadow: '0 0 20px rgba(255,176,0,0.4)' }}>91%</div>
              <div className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.5, marginTop: '4px' }}>Confidence · IoU 0.847</div>
            </div>
            <div className="flex flex-col gap-1.5 text-right">
              <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.4 }}>~247 km²</span>
              <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.4 }}>ALPHA-7</span>
            </div>
          </div>
        </div>
      )}

      {scanning && (
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--phosphor)', animation: 'status-blink 0.5s infinite' }} />
          <span className="font-mono text-xs" style={{ color: 'var(--phosphor)' }}>Scanning SAR scene…</span>
        </div>
      )}

      {/* Scene metadata */}
      <div className="flex flex-col gap-3 mt-auto">
        <div className="section-divider" />
        {[
          { k: 'Scene ID',    v: 'S1A_IW_GRDH_20260824' },
          { k: 'Pass',        v: 'Ascending · T047' },
          { k: 'Resolution',  v: '10 m GRD' },
          { k: 'Model',       v: 'YOLOv8-seg' },
        ].map(({ k, v }) => (
          <div key={k} className="flex justify-between items-baseline">
            <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.38 }}>{k}</span>
            <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.75 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
