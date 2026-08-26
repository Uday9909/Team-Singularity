import { useEffect, useRef } from 'react'
import { useVesselSimulation } from '../../hooks/useVesselSimulation'
import {
  SPILL_GEOJSON,
  MAP_CENTER,
  MAP_ZOOM_END,
  GLOBE_START_CENTER,
  GLOBE_START_ZOOM,
  GLOBE_START_BEARING,
} from '../../data/demo'

// ── Interpolation helpers ─────────────────────────────────────────────────────
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}
function lerp(a, b, t) {
  return a + (b - a) * t
}

/**
 * Unified globe → map component.
 *
 * Renders a single MapLibre GL instance in globe projection.
 * `scrollProgress` (0→1) drives the camera from full-Earth orbit
 * down to a country-level view of the Gulf of Mexico.
 *
 * Scroll-zoom is permanently disabled so the page never gets
 * trapped inside the map.  Pan + double-click-zoom are enabled
 * once the hero animation completes (scrollProgress ≥ 1).
 */
export function GlobeMapView({ scrollProgress = 0, onVesselSelect, selectedVesselId }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const loadedRef = useRef(false)
  const markersRef = useRef({})
  const spillAnimRef = useRef(null)
  const vessels = useVesselSimulation(3000)

  // ── Initialise MapLibre with globe projection ──────────────────────────────
  useEffect(() => {
    let map = null
    const container = containerRef.current
    if (!container) return

    const init = async () => {
      const ml = await import('maplibre-gl')
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
        center: GLOBE_START_CENTER,
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
          // Fallback: stays in mercator
          try { map.setProjection('globe') } catch { /* ok */ }
        }

        // ── Atmospheric fog (space-color = void so globe floats) ─────────
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
          // No fog support — still fine visually
        }

        // ── Disable every interaction handler ─────────────────────────────
        map.scrollZoom.disable()
        map.dragPan.disable()
        map.dragRotate.disable()
        map.doubleClickZoom.disable()
        map.touchZoomRotate.disable()
        try { map.keyboard.disable() } catch { /* ok */ }

        // ── Spill polygon (visible only when zoomed in) ──────────────────
        map.addSource('spill', { type: 'geojson', data: SPILL_GEOJSON })
        map.addLayer({
          id: 'spill-fill',
          type: 'fill',
          source: 'spill',
          paint: { 'fill-color': '#FFB000', 'fill-opacity': 0.28 },
          minzoom: 4,
        })
        map.addLayer({
          id: 'spill-outline',
          type: 'line',
          source: 'spill',
          paint: { 'line-color': '#FFB000', 'line-width': 2, 'line-opacity': 0.9 },
          minzoom: 4,
        })
        map.addLayer({
          id: 'spill-glow',
          type: 'line',
          source: 'spill',
          paint: {
            'line-color': '#FFB000',
            'line-width': 8,
            'line-opacity': 0.12,
            'line-blur': 6,
          },
          minzoom: 4,
        })

        // ── Animate spill drift / expansion ──────────────────────────────
        const t0 = Date.now()
        const animSpill = () => {
          if (!mapRef.current) return
          const elapsed = (Date.now() - t0) / 1000
          const src = map.getSource('spill')
          if (src) {
            const data = JSON.parse(JSON.stringify(SPILL_GEOJSON))
            const coords = data.features[0].geometry.coordinates[0]
            let cx = 0
            let cy = 0
            coords.forEach(([x, y]) => { cx += x; cy += y })
            cx /= coords.length
            cy /= coords.length
            const exp = 1 + elapsed * 0.002
            const dx = elapsed * 0.0001
            const dy = elapsed * 0.00005
            data.features[0].geometry.coordinates[0] = coords.map(([x, y]) => [
              cx + (x - cx) * exp + dx,
              cy + (y - cy) * exp + dy,
            ])
            src.setData(data)
          }
          spillAnimRef.current = requestAnimationFrame(animSpill)
        }
        spillAnimRef.current = requestAnimationFrame(animSpill)
      })
    }

    init()

    return () => {
      cancelAnimationFrame(spillAnimRef.current)
      Object.values(markersRef.current).forEach((m) => m?.remove?.())
      markersRef.current = {}
      map?.remove()
      mapRef.current = null
      loadedRef.current = false
    }
  }, [])

  // ── Scroll-driven camera (zoom + center + bearing) ─────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return

    const p = Math.max(0, Math.min(1, scrollProgress))
    const ep = easeOutCubic(p)

    map.jumpTo({
      center: [
        lerp(GLOBE_START_CENTER[0], MAP_CENTER[0], ep),
        lerp(GLOBE_START_CENTER[1], MAP_CENTER[1], ep),
      ],
      zoom: lerp(GLOBE_START_ZOOM, MAP_ZOOM_END, ep),
      bearing: lerp(GLOBE_START_BEARING, 0, ep),
      pitch: 0,
    })

    // Enable map interaction once the hero animation finishes
    if (p >= 1) {
      map.dragPan.enable()
      map.doubleClickZoom.enable()
    } else {
      map.dragPan.disable()
      map.doubleClickZoom.disable()
    }
    // scrollZoom stays permanently disabled → no scroll trapping
  }, [scrollProgress])

  // ── Vessel markers (only render once zoomed in enough) ─────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return

    const zoom = map.getZoom()

    vessels.forEach((v) => {
      if (!markersRef.current[v.id]) {
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
          markersRef.current[v.id] = marker
        })
      } else {
        markersRef.current[v.id]?.setLngLat([v.lon, v.lat])
      }
    })
  }, [vessels, onVesselSelect, scrollProgress])

  // ── Selected vessel highlight ──────────────────────────────────────────────
  useEffect(() => {
    vessels.forEach((v) => {
      const mk = markersRef.current[v.id]
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
