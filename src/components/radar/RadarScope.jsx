import { useEffect, useRef, useCallback } from 'react'
import { RadarSweep } from './RadarSweep'
import { useVesselSimulation } from '../../hooks/useVesselSimulation'
import { SPILL_GEOJSON, MAP_CENTER, MAP_ZOOM_START, MAP_ZOOM_END } from '../../data/demo'

// Bearing from map center to lat/lon (degrees, 0=N clockwise)
function bearing(fromLat, fromLon, toLat, toLon) {
  const dLon = ((toLon - fromLon) * Math.PI) / 180
  const lat1 = (fromLat * Math.PI) / 180
  const lat2 = (toLat * Math.PI) / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function RadarScope({ onVesselSelect, selectedVesselId }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const sweepRef = useRef(null)
  const vessels = useVesselSimulation(3000)
  const vesselBearingsRef = useRef({})

  // ── Glow pulse on a marker element ────────────────────────────────────────
  const pulseMarker = useCallback(async (el) => {
    const { animate } = await import('animejs')
    animate(el, {
      keyframes: [
        { boxShadow: '0 0 20px rgba(57,255,106,1), 0 0 40px rgba(57,255,106,0.6)' },
        { boxShadow: '0 0 8px rgba(57,255,106,0.7), 0 0 20px rgba(57,255,106,0.3)' },
      ],
      duration: 600,
      ease: 'outExpo',
    })
  }, [])

  const pulseAmberMarker = useCallback(async (el) => {
    const { animate } = await import('animejs')
    animate(el, {
      keyframes: [
        { boxShadow: '0 0 20px rgba(255,176,0,1), 0 0 40px rgba(255,176,0,0.6)' },
        { boxShadow: '0 0 8px rgba(255,176,0,0.8), 0 0 24px rgba(255,176,0,0.35)' },
      ],
      duration: 600,
      ease: 'outExpo',
    })
  }, [])

  // ── Sweep angle update → check which vessel is under sweep ────────────────
  const onAngleUpdate = useCallback((sweepAngle) => {
    vessels.forEach(v => {
      const b = vesselBearingsRef.current[v.id]
      if (b === undefined) return
      const diff = ((sweepAngle - b + 360) % 360)
      // Within 12° trailing edge of sweep
      if (diff < 12) {
        const el = markersRef.current[v.id]
        if (el) {
          if (v.isSuspect) pulseAmberMarker(el)
          else pulseMarker(el)
        }
      }
    })
  }, [vessels, pulseMarker, pulseAmberMarker])

  // ── Init MapLibre ──────────────────────────────────────────────────────────
  useEffect(() => {
    let map = null

    const initMap = async () => {
      const maplibre = await import('maplibre-gl')
      const MapLibre = maplibre.default || maplibre

      // Self-contained raster style — no external style URL needed.
      // OSM tiles are always available and the CSS invert filter darkens them.
      const darkRasterStyle = {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '\u00a9 OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }],
      }

      map = new MapLibre.Map({
        container: mapContainerRef.current,
        style: darkRasterStyle,
        center: MAP_CENTER,   // [-89.1, 27.5] Gulf of Mexico
        zoom: MAP_ZOOM_START, // 4
        interactive: true,
        attributionControl: false,
        pitchWithRotate: false,
      })

      mapRef.current = map

      map.on('load', () => {
        // Apply dark filter to the entire map container so it works with raster tiles
        if (mapContainerRef.current) {
          mapContainerRef.current.style.filter =
            'invert(1) hue-rotate(180deg) brightness(0.65) saturate(1.5) contrast(1.1)'
        }

        // ── Spill polygon ─────────────────────────────────────────────────
        map.addSource('spill', { type: 'geojson', data: SPILL_GEOJSON })
        map.addLayer({
          id: 'spill-fill',
          type: 'fill',
          source: 'spill',
          paint: { 'fill-color': '#FFB000', 'fill-opacity': 0.4 },
        })
        map.addLayer({
          id: 'spill-outline',
          type: 'line',
          source: 'spill',
          paint: { 'line-color': '#FFB000', 'line-width': 2.5, 'line-opacity': 0.9 },
        })

        // ── flyTo into Gulf of Mexico ─────────────────────────────────────
        setTimeout(() => {
          map.flyTo({
            center: MAP_CENTER,
            zoom: MAP_ZOOM_END, // 6.5
            duration: 4500,
            essential: true,
            easing: t => 1 - Math.pow(1 - t, 4),
          })
        }, 200)
      })
    }

    initMap()

    return () => {
      Object.values(markersRef.current).forEach(m => m._el?.remove?.())
      markersRef.current = {}
      map?.remove()
    }
  }, [])

  // ── Sync vessel markers ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.loaded?.()) return

    vessels.forEach(v => {
      // Update bearing cache for sweep detection
      vesselBearingsRef.current[v.id] = bearing(
        MAP_CENTER[1], MAP_CENTER[0],
        v.lat, v.lon
      )

      if (!markersRef.current[v.id]) {
        // Create marker DOM element
        const wrapper = document.createElement('div')
        wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer'

        const dot = document.createElement('div')
        dot.className = `vessel-marker${v.isSuspect ? ' suspect' : ''}`
        dot.id = `marker-${v.id}`
        dot.title = v.name
        dot.addEventListener('click', () => onVesselSelect?.(v.id))

        const label = document.createElement('div')
        label.className = 'vessel-label'
        label.textContent = v.id

        wrapper.appendChild(dot)
        wrapper.appendChild(label)

        // Import MapLibre and create marker
        import('maplibre-gl').then(({ default: MapLibre, Marker }) => {
          const M = Marker || MapLibre.Marker
          const marker = new M({ element: wrapper, anchor: 'top' })
            .setLngLat([v.lon, v.lat])
            .addTo(map)
          markersRef.current[v.id] = dot  // store dot el for glow
          markersRef.current[`${v.id}_marker`] = marker
        })
      } else {
        // Update marker position
        const marker = markersRef.current[`${v.id}_marker`]
        marker?.setLngLat([v.lon, v.lat])
      }
    })
  }, [vessels, onVesselSelect])

  // ── Selected vessel highlight ──────────────────────────────────────────────
  useEffect(() => {
    vessels.forEach(v => {
      const el = markersRef.current[v.id]
      if (!el) return
      if (v.id === selectedVesselId) {
        el.style.transform = 'scale(1.8)'
        el.style.zIndex = '10'
      } else {
        el.style.transform = 'scale(1)'
        el.style.zIndex = '1'
      }
    })
  }, [selectedVesselId, vessels])

  return (
    <div
      id="radar-section"
      className="flex flex-col items-center gap-6 py-16 px-4"
      style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(57,255,106,0.03) 0%, transparent 70%)' }}
    >
      {/* Label */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--phosphor)', opacity: 0.6 }}>
          ◉ Live AIS + SAR Overlay
        </span>
        <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.35 }}>
          Gulf of Mexico · Sector GOM-7
        </span>
      </div>

      {/* Radar scope container — max 420px so panels below have room */}
      <div
        id="radar-scope"
        className="relative"
        style={{
          width: 'clamp(280px, 80vw, 420px)',
          height: 'clamp(280px, 80vw, 420px)',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid rgba(57,255,106,0.35)',
          boxShadow: '0 0 60px rgba(57,255,106,0.1), 0 0 120px rgba(57,255,106,0.04), inset 0 0 40px rgba(0,0,0,0.7)',
        }}
      >
        {/* MapLibre map inside circular clip */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            overflow: 'hidden',
          }}
        />

        {/* Radar sweep overlay — on top, pointer-events:none */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <RadarSweep
            ref={sweepRef}
            size={420}
            onAngleUpdate={onAngleUpdate}
          />
        </div>

        {/* Center dot */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--phosphor)',
            boxShadow: 'var(--glow-green)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Spill metadata badge */}
      <div
        className="flex items-center gap-3 px-4 py-2 rounded"
        style={{
          background: 'rgba(255,176,0,0.08)',
          border: '1px solid rgba(255,176,0,0.3)',
          boxShadow: '0 0 16px rgba(255,176,0,0.08)',
        }}
      >
        <span style={{ color: 'var(--amber)', fontSize: 16 }}>⬡</span>
        <div>
          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--amber)' }}>
            SPILL ALPHA-7
          </span>
          <span className="font-mono text-xs ml-3" style={{ color: 'var(--bone)', opacity: 0.6 }}>
            27.4°N · 89.1°W · Conf. 91.0%
          </span>
        </div>
      </div>
    </div>
  )
}
