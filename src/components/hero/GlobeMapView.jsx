import { useEffect, useRef } from 'react'
import { useVesselSimulation } from '../../hooks/useVesselSimulation'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import {
  SPILL_GEOJSON,
  MAP_CENTER,
  MAP_ZOOM_END,
  SPILL_ORIGIN,
  CINEMATIC_ZOOM,
  INITIAL_VESSELS,
  GLOBE_START_CENTER,
  GLOBE_START_ZOOM,
  GLOBE_START_BEARING,
  SPILL_LOCATIONS
} from '../../data/demo'

// ── Interpolation helpers ─────────────────────────────────────────────────────
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
function lerp(a, b, t) {
  return a + (b - a) * t
}

// ── Drift model ───────────────────────────────────────────────────────────────
// Computed fresh from BASE_RING each frame rather than accumulated, so the drift
// is a pure function of elapsed time — that is what lets any frame be reproduced
// on demand (the restore blends back into `ringAt(elapsed)` with no seam).
const BASE_RING = SPILL_GEOJSON.features[0].geometry.coordinates[0]
const RING_PROPS = SPILL_GEOJSON.features[0].properties
const CX = BASE_RING.reduce((s, [x]) => s + x, 0) / BASE_RING.length
const CY = BASE_RING.reduce((s, [, y]) => s + y, 0) / BASE_RING.length

// Ceiling on drift so a dashboard left open for ten minutes doesn't present a
// 2.2x-expanded slick.
const DRIFT_CAP_S = 120
// Ceiling on the collapse lerp — 1.0 hands MapLibre a zero-area ring.
const COLLAPSE_MAX = 0.97

function ringAt(elapsed) {
  const e = Math.min(elapsed, DRIFT_CAP_S)
  const exp = 1 + e * 0.002
  const dx = e * 0.0001
  const dy = e * 0.00005
  return BASE_RING.map(([x, y]) => [CX + (x - CX) * exp + dx, CY + (y - CY) * exp + dy])
}

// A collapsed ring is just every vertex lerped toward the origin point.
function collapse(ring, k) {
  return ring.map(([x, y]) => [lerp(x, SPILL_ORIGIN.lon, k), lerp(y, SPILL_ORIGIN.lat, k)])
}

function pushRing(src, ring) {
  if (!src) return
  src.setData({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: RING_PROPS,
      geometry: { type: 'Polygon', coordinates: [ring] },
    }],
  })
}

function pushConnector(src, to, t) {
  if (!src) return
  src.setData({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [ORIGIN_LL, [lerp(SPILL_ORIGIN.lon, to[0], t), lerp(SPILL_ORIGIN.lat, to[1], t)]],
    },
  })
}

const ORIGIN_LL = [SPILL_ORIGIN.lon, SPILL_ORIGIN.lat]
const SUSPECT_ID = INITIAL_VESSELS.find(v => v.isSuspect)?.id ?? INITIAL_VESSELS[0].id
const FALLBACK_VESSEL_LL = [INITIAL_VESSELS[0].lon, INITIAL_VESSELS[0].lat]

// ── Sequence timings (ms) ─────────────────────────────────────────────────────
const PAN_MS = 2500
const BACKTRACK_MS = 1400
const ORIGIN_MS = 700
const CONNECT_MS = 600
const RESTORE_MS = 600

/**
 * Unified globe → map component.
 *
 * Renders a single MapLibre GL instance in globe projection.
 * `scrollProgress` (0→1) drives the camera from full-Earth orbit
 * down to a country-level view of the Gulf of Mexico.
 */
export function GlobeMapView({ scrollProgress = 0, onVesselSelect, selectedVesselId, onSpillHover, onSpillSelect, scanId = 0, revealed = false, onRevealComplete }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const loadedRef = useRef(false)

  const vesselMarkersRef = useRef({})
  const spillMarkersRef = useRef({})
  const spillAnimRef = useRef(null)
  const rotateAnimRef = useRef(null)

  const vessels = useVesselSimulation(3000)

  // Auto-rotation state
  const globeLngRef = useRef(GLOBE_START_CENTER[0])
  const globeLatRef = useRef(GLOBE_START_CENTER[1])
  const userInteractingRef = useRef(false)
  const hoverInteractingRef = useRef(false)
  const lastTimeRef = useRef(Date.now())
  const interactionTimeoutRef = useRef(null)
  const targetingRef = useRef(false)

  // Backtrack sequence state
  const phaseRef = useRef('idle')        // idle | backtrack | origin | connect | reveal
  const phaseStartRef = useRef(0)
  const dursRef = useRef({ bt: BACKTRACK_MS, connect: CONNECT_MS })
  const backtrackFromRef = useRef(null)
  const zoomFromRef = useRef(MAP_ZOOM_END)
  const connectorActiveRef = useRef(false)
  const spillT0Ref = useRef(0) // stamped on map load, before the drift loop starts
  const originMarkerRef = useRef(null)
  const pingElRef = useRef(null)
  const suspectPosRef = useRef(FALLBACK_VESSEL_LL)

  const reducedMotion = useReducedMotion()
  const reducedMotionRef = useRef(reducedMotion)

  // Use refs for props to avoid stale closures in event listeners
  const scrollProgressRef = useRef(scrollProgress)
  const onSpillHoverRef = useRef(onSpillHover)
  const onSpillSelectRef = useRef(onSpillSelect)
  const onVesselSelectRef = useRef(onVesselSelect)
  const onRevealCompleteRef = useRef(onRevealComplete)
  const selectedIdRef = useRef(selectedVesselId)

  useEffect(() => {
    scrollProgressRef.current = scrollProgress
    onSpillHoverRef.current = onSpillHover
    onSpillSelectRef.current = onSpillSelect
    onVesselSelectRef.current = onVesselSelect
    onRevealCompleteRef.current = onRevealComplete
    selectedIdRef.current = selectedVesselId
    // reducedMotion is mirrored, not a dependency, so an OS-setting flip
    // mid-sequence cannot restart the sequence.
    reducedMotionRef.current = reducedMotion
  }, [scrollProgress, onSpillHover, onSpillSelect, onVesselSelect, onRevealComplete, selectedVesselId, reducedMotion])

  // Live suspect position, so the connector tracks the drifting vessel.
  useEffect(() => {
    const v = vessels.find(x => x.id === SUSPECT_ID)
    if (v) suspectPosRef.current = [v.lon, v.lat]
  }, [vessels])

  const hasDetectionData = scanId > 0

  // ── Backtrack sequence: pan → collapse → origin ping → connector → reveal ──
  // One effect owns the whole timeline; the rAF loop in the map-init effect only
  // reads the phase refs this writes. Two writers to `spill-poly` on the same
  // frame would race.
  useEffect(() => {
    if (!scanId) return

    const reduced = reducedMotionRef.current
    dursRef.current = {
      bt: reduced ? 0 : BACKTRACK_MS,
      connect: reduced ? 0 : CONNECT_MS,
    }

    let cancelled = false
    let raf = 0
    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(() => { if (!cancelled) fn() }, ms))

    // ── Pan (camera travel only) ──
    targetingRef.current = true
    const startLng = globeLngRef.current
    const startLat = globeLatRef.current
    const panDur = reduced ? 0 : PAN_MS
    const startTime = Date.now()

    // Take the shortest path across the date line.
    let targetLng = MAP_CENTER[0]
    if (Math.abs(startLng - targetLng) > 180) {
      targetLng += startLng > targetLng ? 360 : -360
    }

    const panStep = () => {
      if (cancelled) return
      const t = panDur === 0 ? 1 : Math.min((Date.now() - startTime) / panDur, 1)
      const ease = easeOutCubic(t)

      if (t === 1) {
        globeLngRef.current = MAP_CENTER[0]
        globeLatRef.current = MAP_CENTER[1]
        targetingRef.current = false
        return
      }

      let lng = lerp(startLng, targetLng, ease)
      if (lng > 180) lng -= 360
      else if (lng < -180) lng += 360
      globeLngRef.current = lng
      globeLatRef.current = lerp(startLat, MAP_CENTER[1], ease)
      raf = requestAnimationFrame(panStep)
    }
    raf = requestAnimationFrame(panStep)

    const beginOrigin = () => {
      phaseRef.current = 'origin'
      phaseStartRef.current = Date.now()

      const el = originMarkerRef.current?.getElement?.()
      if (el) el.style.display = ''
      // The ping class is applied in JS, never left to the reduced-motion media
      // query: that query caps animation-duration at 0.01ms without capping
      // iteration count, so an infinite animation strobes instead of stopping.
      if (!reduced) pingElRef.current?.classList.add('origin-ping')
      // At MAP_ZOOM_END the ring is ~24px, too small for the connector to read.
      if (reduced) mapRef.current?.jumpTo({ zoom: CINEMATIC_ZOOM })
    }

    const beginReveal = () => {
      phaseRef.current = 'reveal'
      phaseStartRef.current = Date.now()
      if (reduced) mapRef.current?.jumpTo({ zoom: MAP_ZOOM_END })
      onRevealCompleteRef.current?.()
      onVesselSelectRef.current?.(SUSPECT_ID)
    }

    at(panDur, () => {
      phaseRef.current = 'backtrack'
      phaseStartRef.current = Date.now()
      backtrackFromRef.current = ringAt((Date.now() - spillT0Ref.current) / 1000)
      zoomFromRef.current = mapRef.current?.getZoom?.() ?? MAP_ZOOM_END
    })
    at(panDur + dursRef.current.bt, beginOrigin)
    at(panDur + dursRef.current.bt + ORIGIN_MS, () => {
      phaseRef.current = 'connect'
      phaseStartRef.current = Date.now()
      connectorActiveRef.current = true
    })
    at(panDur + dursRef.current.bt + ORIGIN_MS + dursRef.current.connect, beginReveal)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      targetingRef.current = false
      phaseRef.current = 'idle'
      connectorActiveRef.current = false
      backtrackFromRef.current = null
      pingElRef.current?.classList.remove('origin-ping')

      const el = originMarkerRef.current?.getElement?.()
      if (el) el.style.display = 'none'

      const map = mapRef.current
      const cSrc = map?.getSource?.('spill-connector')
      if (cSrc) pushConnector(cSrc, ORIGIN_LL, 1)
      map?.jumpTo?.({ zoom: MAP_ZOOM_END })
    }
  }, [scanId])

  // ── Initialise MapLibre with globe projection ──────────────────────────────
  useEffect(() => {
    let map = null
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    // ... rest of init
    const init = async () => {
      const ml = await import('maplibre-gl')
      // StrictMode's dev double-mount tears this effect down before the dynamic
      // import resolves. Without this guard both mounts build a live map onto
      // the same container — two canvases, two rAF loops, duplicate markers.
      if (cancelled) return
      const ML = ml.default ?? ml

      map = new ML.Map({
        container,
        style: {
          version: 8,
          sources: {
            satellite: {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              ],
              tileSize: 256,
              attribution: '© Esri',
              maxzoom: 18,
            },
          },
          layers: [
            {
              id: 'satellite',
              type: 'raster',
              source: 'satellite',
              minzoom: 0,
              maxzoom: 18,
            },
          ],
        },
        center: [globeLngRef.current, globeLatRef.current],
        zoom: GLOBE_START_ZOOM,
        bearing: GLOBE_START_BEARING,
        pitch: 0,
        interactive: false,
        attributionControl: false,
      })
      mapRef.current = map

      map.on('load', () => {
        loadedRef.current = true

        // ── Globe projection ──────────────────────────────────────────────
        try {
          map.setProjection({ type: 'globe' })
        } catch {
          try { map.setProjection('globe') } catch { /* ok */ }
        }

        // ── Atmospheric fog ───────────────────────────────────────────────
        try {
          map.setFog({
            'range': [0.5, 10],
            'color': 'rgba(186, 210, 235, 0.10)',
            'high-color': 'rgba(36, 92, 223, 0.25)',
            'horizon-blend': 0.02,
            'space-color': '#0B0F0A',
            'star-intensity': 0.5,
          })
        } catch {
          // Fallback
        }

        // ── Disable all interactions initially ─────────────────────────────
        map.scrollZoom.disable()
        map.dragPan.disable()
        map.dragRotate.disable()
        map.doubleClickZoom.disable()
        map.touchZoomRotate.disable()
        try { map.keyboard.disable() } catch { /* ok */ }

        // ── Add Spill Markers ──────────────────────────────────────────────
        SPILL_LOCATIONS.forEach((spill) => {
          const wrapper = document.createElement('div')
          wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:crosshair;pointer-events:auto;'
          
          const dot = document.createElement('div')
          // Add pulse glow styling
          dot.style.cssText = `
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #FFB000;
            box-shadow: 0 0 20px #FFB000, 0 0 40px #FFB000;
            border: 2px solid rgba(255,176,0,0.5);
            animation: status-blink 2s infinite;
          `
          
          const lbl = document.createElement('div')
          lbl.textContent = spill.name
          lbl.style.cssText = `
            font-family: var(--font-hud);
            font-size: 11px;
            color: #FFB000;
            margin-top: 6px;
            letter-spacing: 0.1em;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
            font-weight: 600;
          `
          
          wrapper.append(dot, lbl)
          
          // Interactions
          wrapper.onmouseenter = () => {
            hoverInteractingRef.current = true
            onSpillHoverRef.current?.(spill)
            dot.style.transform = 'scale(1.5)'
            dot.style.boxShadow = '0 0 30px #FFB000, 0 0 60px #FFB000'
          }
          wrapper.onmouseleave = () => {
            hoverInteractingRef.current = false
            onSpillHoverRef.current?.(null)
            dot.style.transform = 'scale(1)'
            dot.style.boxShadow = '0 0 20px #FFB000, 0 0 40px #FFB000'
          }
          wrapper.onclick = (e) => {
            e.stopPropagation()
            onSpillSelectRef.current?.(spill)
          }

          const marker = new ML.Marker({ element: wrapper, anchor: 'center' })
            .setLngLat([spill.lon, spill.lat])
            .addTo(map)
            
          spillMarkersRef.current[spill.id] = marker
        })

        // ── Drag interaction tracking ──────────────────────────────────────
        const onInteractStart = () => {
          userInteractingRef.current = true
          if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)
        }
        map.on('mousedown', onInteractStart)
        map.on('touchstart', onInteractStart)
        map.on('dragstart', onInteractStart)
        
        map.on('drag', () => {
          if (userInteractingRef.current) {
            const center = map.getCenter()
            globeLngRef.current = center.lng
            globeLatRef.current = center.lat
          }
        })
        
        const onInteractEnd = () => {
          if (userInteractingRef.current) {
            interactionTimeoutRef.current = setTimeout(() => {
              userInteractingRef.current = false
            }, 2000)
          }
        }
        map.on('dragend', onInteractEnd)
        map.on('mouseup', onInteractEnd)
        map.on('touchend', onInteractEnd)

        // ── Spill polygon (visible only when zoomed in) ──────────────────
        map.addSource('spill-poly', { type: 'geojson', data: SPILL_GEOJSON })
        map.addLayer({
          id: 'spill-fill',
          type: 'fill',
          source: 'spill-poly',
          paint: { 'fill-color': '#FFB000', 'fill-opacity': 0.28 },
          minzoom: 4,
        })
        map.addLayer({
          id: 'spill-outline',
          type: 'line',
          source: 'spill-poly',
          paint: { 'line-color': '#FFB000', 'line-width': 2, 'line-opacity': 0.9 },
          minzoom: 4,
        })

        // ── Backtrack origin marker + connector (revealed by the sequence) ──
        const originEl = document.createElement('div')
        originEl.style.cssText = 'position:absolute;width:0;height:0;display:none;pointer-events:none;'
        const core = document.createElement('div')
        core.className = 'origin-core'
        const ping = document.createElement('div')
        const label = document.createElement('div')
        label.className = 'origin-label'
        label.textContent = 'DISCHARGE ORIGIN'
        originEl.append(ping, core, label)
        pingElRef.current = ping
        originMarkerRef.current = new ML.Marker({ element: originEl, anchor: 'top-left' })
          .setLngLat(ORIGIN_LL)
          .addTo(map)

        map.addSource('spill-connector', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [ORIGIN_LL, ORIGIN_LL] },
          },
        })
        map.addLayer({
          id: 'spill-connector-line',
          type: 'line',
          source: 'spill-connector',
          paint: {
            'line-color': '#FF2D6B',
            'line-width': 1.5,
            'line-opacity': 0.9,
            'line-dasharray': [2, 2],
          },
        })

        // ── Drift + backtrack loop ───────────────────────────────────────
        spillT0Ref.current = Date.now()
        const spillSrc = map.getSource('spill-poly')

        const animSpill = () => {
          if (!mapRef.current) return
          spillAnimRef.current = requestAnimationFrame(animSpill)

          const now = Date.now()
          const phase = phaseRef.current
          const { bt, connect } = dursRef.current

          let ring
          if (phase === 'backtrack') {
            const t = bt <= 0 ? 1 : Math.min((now - phaseStartRef.current) / bt, 1)
            const e = easeInOutCubic(t)
            ring = collapse(backtrackFromRef.current ?? BASE_RING, COLLAPSE_MAX * e)
            // Zoom is driven from inside the loop so it lands in the same frame
            // as the collapse; the scroll effect would stomp it otherwise.
            if (bt > 0) map.jumpTo({ zoom: lerp(zoomFromRef.current, CINEMATIC_ZOOM, e) })
          } else if (phase === 'origin' || phase === 'connect') {
            ring = collapse(backtrackFromRef.current ?? BASE_RING, COLLAPSE_MAX)
          } else if (phase === 'reveal') {
            const e = Math.min((now - phaseStartRef.current) / RESTORE_MS, 1)
            ring = collapse(ringAt((now - spillT0Ref.current) / 1000), COLLAPSE_MAX * (1 - easeInOutCubic(e)))
            map.jumpTo({ zoom: lerp(CINEMATIC_ZOOM, MAP_ZOOM_END, easeInOutCubic(e)) })
            if (e >= 1) phaseRef.current = 'idle'
          } else {
            ring = ringAt((now - spillT0Ref.current) / 1000)
          }
          pushRing(spillSrc, ring)

          if (connectorActiveRef.current) {
            const t = phase !== 'connect' ? 1
              : connect <= 0 ? 1
              : Math.min((now - phaseStartRef.current) / connect, 1)
            pushConnector(map.getSource('spill-connector'), suspectPosRef.current, t)
          }
        }
        spillAnimRef.current = requestAnimationFrame(animSpill)
      })
    }

    init()

    return () => {
      cancelled = true
      cancelAnimationFrame(spillAnimRef.current)
      cancelAnimationFrame(rotateAnimRef.current)
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)
      Object.values(vesselMarkersRef.current).forEach((m) => m?.remove?.())
      Object.values(spillMarkersRef.current).forEach((m) => m?.remove?.())
      vesselMarkersRef.current = {}
      spillMarkersRef.current = {}
      phaseRef.current = 'idle'
      connectorActiveRef.current = false
      backtrackFromRef.current = null
      pingElRef.current = null
      originMarkerRef.current = null
      map?.remove()
      mapRef.current = null
      loadedRef.current = false
    }
  }, [])

  const dashboardBearingRef = useRef(0)
  
  // ── Auto-rotation Loop ───────────────────────────────────────────────────
  useEffect(() => {
    const rotate = () => {
      rotateAnimRef.current = requestAnimationFrame(rotate)
      const now = Date.now()
      const dt = now - lastTimeRef.current
      lastTimeRef.current = now

      if (!mapRef.current || !loadedRef.current) return
      
      const p = Math.max(0, Math.min(1, scrollProgressRef.current))
      
      if (hasDetectionData && p === 1 && !targetingRef.current) {
        // FIXED CAMERA MODE: spin the bearing clockwise. Held still while the
        // backtrack sequence runs — a spinning bearing at zoom 8.5 is unreadable.
        if (!userInteractingRef.current && phaseRef.current === 'idle') {
          dashboardBearingRef.current += (3 * dt) / 1000 // 3 degrees per second
          if (dashboardBearingRef.current >= 360) dashboardBearingRef.current -= 360
        }
        
        mapRef.current.jumpTo({
          center: MAP_CENTER,
          bearing: dashboardBearingRef.current
        })
      } else {
        // EARTH ROTATION MODE
        if (!userInteractingRef.current && !hoverInteractingRef.current && !targetingRef.current) {
          // Rotate ~1.5 degrees every second
          const rotationSpeed = 1.5 // degrees per second
          globeLngRef.current += (rotationSpeed * dt) / 1000
          if (globeLngRef.current > 180) globeLngRef.current -= 360
        }
        
        mapRef.current.jumpTo({
          center: [globeLngRef.current, globeLatRef.current],
        })
      }
    }
    
    rotateAnimRef.current = requestAnimationFrame(rotate)
    return () => cancelAnimationFrame(rotateAnimRef.current)
  }, [hasDetectionData])

  // ── Scroll-driven camera (zoom + center + bearing) ─────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return

    const p = Math.max(0, Math.min(1, scrollProgress))
    const ep = easeOutCubic(p)

    // Apply scroll-driven jump only if transitioning
    if (p > 0 && p < 1) {
      // Interpolate bearing correctly back to GLOBE_START_BEARING when scrolling up
      const targetBearing = hasDetectionData ? dashboardBearingRef.current : 0
      map.jumpTo({
        zoom: lerp(GLOBE_START_ZOOM, MAP_ZOOM_END, ep),
        bearing: lerp(GLOBE_START_BEARING, targetBearing, ep),
        pitch: 0,
      })
      
      if (hasDetectionData) {
        // Also interpolate center back to MAP_CENTER if we have detection data
        map.jumpTo({
          center: [
            lerp(globeLngRef.current, MAP_CENTER[0], ep),
            lerp(globeLatRef.current, MAP_CENTER[1], ep),
          ]
        })
      }
    } else if (p === 0) {
      map.jumpTo({ bearing: GLOBE_START_BEARING, zoom: GLOBE_START_ZOOM })
      dashboardBearingRef.current = 0
    } else if (p === 1) {
      map.jumpTo({ zoom: MAP_ZOOM_END })
      if (!hasDetectionData) {
         map.jumpTo({ bearing: 0 })
         dashboardBearingRef.current = 0
      }
    }

    // Interaction states based on scroll
    if (p >= 1) {
      map.dragPan.enable()
      map.doubleClickZoom.enable()
    } else if (p === 0) {
      map.dragPan.enable() // Allow rotating the globe
      map.doubleClickZoom.disable()
    } else {
      map.dragPan.disable()
      map.doubleClickZoom.disable()
    }
  }, [scrollProgress, hasDetectionData])

  // ── Vessel markers (gated on the reveal, then on zoom) ─────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return

    // Before the reveal, no vessel is on the map — the suspect is the only one
    // that ever appears. Early-out on the empty case so the 3s simulation tick
    // doesn't churn remove() calls.
    if (!revealed) {
      const ids = Object.keys(vesselMarkersRef.current)
      if (ids.length === 0) return
      ids.forEach((id) => {
        vesselMarkersRef.current[id]?.remove?.()
        delete vesselMarkersRef.current[id]
      })
      return
    }

    const zoom = map.getZoom()

    vessels.forEach((v) => {
      if (!vesselMarkersRef.current[v.id]) {
        // Wait until zoomed in to avoid markers on the full-globe view
        if (zoom < 4) return

        const wrapper = document.createElement('div')
        wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;'

        const dot = document.createElement('div')
        dot.className = `vessel-marker${v.isSuspect ? ' suspect' : ''}`
        dot.id = `marker-${v.id}`
        dot.title = `${v.name} · ${v.id}`
        dot.onclick = () => onVesselSelect?.(v.id)

        const lbl = document.createElement('div')
        lbl.className = 'vessel-label'
        lbl.textContent = v.id

        wrapper.append(dot, lbl)

        import('maplibre-gl').then((mod) => {
          const ML = mod.default ?? mod
          const Mk = mod.Marker ?? ML.Marker
          const marker = new Mk({ element: wrapper, anchor: 'top' })
            .setLngLat([v.lon, v.lat])
            .addTo(map)
          vesselMarkersRef.current[v.id] = marker
          // The highlight effect may already have run before this marker
          // existed (creation is async), so re-apply the current selection here.
          if (selectedIdRef.current === v.id) {
            dot.style.transform = 'scale(2)'
            dot.style.zIndex = '10'
          }
        })
      } else {
        vesselMarkersRef.current[v.id]?.setLngLat([v.lon, v.lat])
      }
    })
  }, [vessels, onVesselSelect, scrollProgress, revealed])

  // ── Selected vessel highlight ──────────────────────────────────────────────
  useEffect(() => {
    vessels.forEach((v) => {
      const mk = vesselMarkersRef.current[v.id]
      if (!mk) return
      const el = typeof mk.getElement === 'function' ? mk.getElement() : mk._element
      if (!el) return
      const dot = el.querySelector('.vessel-marker')
      if (!dot) return
      dot.style.transform = v.id === selectedVesselId ? 'scale(2)' : 'scale(1)'
      dot.style.zIndex = v.id === selectedVesselId ? '10' : '1'
    })
  }, [selectedVesselId, vessels])

  return (
    <div
      ref={containerRef}
      id="globe-map"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  )
}
