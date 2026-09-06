import { useEffect, useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { checkHealth, runForecast, runHindcast, apiBase } from '../lib/modelApi'

const PRESETS = {
  'ALPHA-7 · Gulf of Mexico': { lat: 27.45, lon: -89.1 },
  'Mumbai coast': { lat: 18.5, lon: 71.5 },
}

const OIL_TYPES = [
  'GENERIC HEAVY CRUDE',
  'GENERIC MEDIUM CRUDE',
  'GENERIC LIGHT CRUDE',
  'GENERIC CONDENSATE',
  'GENERIC DIESEL',
  'GENERIC GASOLINE',
]

const fmt = (s) => (s == null ? '—' : String(s))
const download = (name, data) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function ModelLab() {
  const [health, setHealth] = useState(null) // null | {ok, opendrift_available, error}
  const [preset, setPreset] = useState(Object.keys(PRESETS)[0])
  const [lat, setLat] = useState('27.45')
  const [lon, setLon] = useState('-89.1')
  const [radiusM, setRadiusM] = useState('1500')
  const [hours, setHours] = useState('24')
  const [time, setTime] = useState('') // optional ISO; blank -> server "now"
  const [oil, setOil] = useState(OIL_TYPES[0])
  const [busy, setBusy] = useState(null) // null | 'forecast' | 'hindcast'
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    checkHealth()
      .then((h) => alive && setHealth({ ok: true, opendrift_available: h.opendrift_available }))
      .catch((e) => alive && setHealth({ ok: false, error: e.message }))
    return () => { alive = false }
  }, [])

  const pickPreset = (name) => {
    setPreset(name)
    setLat(String(PRESETS[name].lat))
    setLon(String(PRESETS[name].lon))
  }

  const run = async (mode) => {
    setBusy(mode); setError(null); setResult(null)
    const n = (v, fallback) => (v === '' ? undefined : Number(v) ?? fallback)
    const common = { oil_type: oil }
    const payload = mode === 'forecast'
      ? { ...common, spill_lat: n(lat), spill_lon: n(lon), detection_time: time || undefined, duration_hours: n(hours, 24), radius_m: n(radiusM, 1000) }
      : { ...common, observed_lat: n(lat), observed_lon: n(lon), observation_time: time || undefined, backward_duration_hours: n(hours, 24), radius_m: n(radiusM, 2500) }
    try {
      setResult(await (mode === 'forecast' ? runForecast(payload) : runHindcast(payload)))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  const features = result?.geojson?.features ?? []
  const ais = result?.ais_areas ?? []
  const healthChip = !health ? '…' : health.ok
    ? (health.opendrift_available ? 'API ONLINE · MODEL READY' : 'API ONLINE · MODEL OFFLINE')
    : 'API OFFLINE'

  return (
    <div className="min-h-screen" style={{ background: 'var(--void)', color: 'var(--bone)' }}>
      <TopBar />
      <main className="mx-auto max-w-6xl px-5 sm:px-8" style={{ paddingTop: '88px', paddingBottom: '80px' }}>
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="font-mono text-xs tracking-widest mb-1" style={{ color: 'var(--phosphor)', opacity: 0.6 }}>
              BACKEND LINK · {apiBase}
            </div>
            <h1 className="font-display font-semibold" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-0.01em' }}>
              OpenDrift Trajectory API
            </h1>
            <p className="font-mono text-sm mt-1" style={{ color: 'var(--bone)', opacity: 0.45 }}>
              Forward footprint forecast · Backward origin hindcast · AIS search targets
            </p>
          </div>
          <span
            className="font-mono text-xs px-3 py-1.5 rounded-lg"
            style={{
              border: '1px solid var(--hairline)',
              background: 'rgba(11,15,10,0.6)',
              color: health?.ok && health.opendrift_available ? 'var(--phosphor)' : 'var(--amber)',
            }}
          >
            {healthChip}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* ── Control panel ── */}
          <div className="glass-panel flex flex-col gap-5 lg:col-span-2" style={{ padding: '24px', background: 'rgba(11,15,10,0.72)' }}>
            <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--phosphor)', opacity: 0.6 }}>SCENARIO INPUT</span>
            <div className="section-divider" />

            <div>
              <div className="font-mono text-xs mb-2" style={{ color: 'var(--bone)', opacity: 0.4 }}>Presets</div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(PRESETS).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => pickPreset(name)}
                    className="font-mono text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      border: `1px solid ${preset === name ? 'var(--phosphor)' : 'var(--hairline)'}`,
                      color: preset === name ? 'var(--phosphor)' : 'var(--bone)',
                      opacity: preset === name ? 1 : 0.55,
                      background: preset === name ? 'rgba(57,255,106,0.08)' : 'transparent',
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="LATITUDE"><input style={inputStyle} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="27.45" /></Field>
              <Field label="LONGITUDE"><input style={inputStyle} value={lon} onChange={(e) => setLon(e.target.value)} placeholder="-89.1" /></Field>
              <Field label="SPILL RADIUS (m)"><input style={inputStyle} value={radiusM} onChange={(e) => setRadiusM(e.target.value)} placeholder="1500" /></Field>
              <Field label="DURATION (h)"><input style={inputStyle} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="24" /></Field>
            </div>

            <Field label="DETECTION / OBSERVATION TIME — ISO, UTC (blank = now)">
              <input style={inputStyle} value={time} onChange={(e) => setTime(e.target.value)} placeholder="2026-09-04T12:00:00Z" />
            </Field>

            <Field label="OIL TYPE">
              <select style={inputStyle} value={oil} onChange={(e) => setOil(e.target.value)}>
                {OIL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <div className="flex flex-col gap-2 mt-1">
              <button type="button" onClick={() => run('forecast')} disabled={!!busy} className="font-mono text-xs tracking-widest py-2.5 rounded-lg transition-all" style={btnStyle}>
                {busy === 'forecast' ? 'RUNNING FORECAST…' : 'RUN FORWARD FORECAST →'}
              </button>
              <button type="button" onClick={() => run('hindcast')} disabled={!!busy} className="font-mono text-xs tracking-widest py-2.5 rounded-lg transition-all" style={btnStyle}>
                {busy === 'hindcast' ? 'RUNNING HINDCAST…' : 'RUN BACKWARD HINDCAST ←'}
              </button>
              {busy && (
                <p className="font-mono text-xs mt-1" style={{ color: 'var(--amber)' }}>
                  Synchronous OpenDrift run — fetches live ocean/wind, then simulates. Keep this tab open (1–5+ min).
                </p>
              )}
            </div>
          </div>

          {/* ── Results ── */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {error && (
              <div className="glass-panel" style={{ padding: '16px 20px', border: '1px solid rgba(255,120,90,0.4)', color: '#ff9c7a' }}>
                <div className="font-mono text-xs tracking-widest mb-1" style={{ opacity: 0.7 }}>MODEL ERROR</div>
                <p className="font-mono text-sm whitespace-pre-wrap">{error}</p>
              </div>
            )}

            {result && (
              <>
                <div className="glass-panel flex items-center justify-between" style={{ padding: '16px 20px', background: 'rgba(11,15,10,0.72)' }}>
                  <div>
                    <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--phosphor)' }}>{result.mode.toUpperCase()} COMPLETE</div>
                    <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--bone)', opacity: 0.4 }}>
                      {features.length} time-sequenced region{features.length === 1 ? '' : 's'} · {ais.length} AIS target{ais.length === 1 ? '' : 's'} · {result.generated_at}
                    </div>
                  </div>
                  <button type="button" onClick={() => download(`${result.mode}-output.json`, result)} className="font-mono text-xs px-3 py-1.5 rounded-lg" style={ghostBtn}>
                    EXPORT JSON
                  </button>
                </div>

                <div className="glass-panel flex flex-col gap-3" style={{ padding: '20px', background: 'rgba(11,15,10,0.72)' }}>
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--bone)', opacity: 0.4 }}>REGIONS OVER TIME</span>
                    <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.3 }}>particles / hull</span>
                  </div>
                  <div className="section-divider" />
                  <div className="max-h-56 overflow-y-auto flex flex-col">
                    {features.map((f, i) => (
                      <div key={i} className="flex justify-between items-baseline py-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <span className="font-mono text-xs" style={{ color: f.properties.is_origin_probability_region ? 'var(--amber)' : 'var(--bone)', opacity: 0.85 }}>
                          t+{i}h {fmt(f.properties.time)}
                          {f.properties.is_origin_probability_region && ' ★ ORIGIN ZONE'}
                        </span>
                        <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.5 }}>{fmt(f.properties.particle_count)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {ais.length > 0 && (
                  <div className="glass-panel flex flex-col gap-3" style={{ padding: '20px', background: 'rgba(11,15,10,0.72)' }}>
                    <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--bone)', opacity: 0.4 }}>AIS VESSEL SEARCH TARGETS</span>
                    <div className="section-divider" />
                    {ais.map((a, i) => (
                      <div key={i} className="flex flex-wrap justify-between gap-2 items-baseline py-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <span className="font-mono text-xs" style={{ color: 'var(--phosphor)' }}>
                          {fmt(a.predicted_lat)}°, {fmt(a.predicted_lon)}°
                        </span>
                        <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.5 }}>
                          ±{fmt(a.uncertainty_radius_km)} km · {fmt(a.time)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {!result && !error && !busy && (
              <div className="glass-panel flex flex-col items-center justify-center" style={{ padding: '48px', background: 'rgba(11,15,10,0.5)', color: 'var(--bone)', opacity: 0.4 }}>
                <span className="font-mono text-sm">Set a scenario and run a model — results land here.</span>
                <span className="font-mono text-xs mt-2">Raw GeoJSON polygons are map-ready for a MapLibre layer.</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px]" style={{ color: 'var(--bone)', opacity: 0.45 }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid var(--hairline)',
  background: 'rgba(0,0,0,0.35)',
  color: 'var(--bone)',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '13px',
  outline: 'none',
}
const btnStyle = {
  border: '1px solid rgba(57,255,106,0.5)',
  color: 'var(--phosphor)',
  background: 'rgba(57,255,106,0.08)',
  boxShadow: '0 0 14px rgba(57,255,106,0.12)',
  cursor: 'pointer',
  opacity: 1,
}
const ghostBtn = {
  border: '1px solid var(--hairline)',
  color: 'var(--bone)',
  background: 'transparent',
  opacity: 0.8,
  cursor: 'pointer',
}
