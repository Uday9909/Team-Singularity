import { useEffect, useRef } from 'react'
import { useVesselSimulation } from '../../hooks/useVesselSimulation'
import {
  SPILL_GEOJSON,
  MAP_CENTER,
  MAP_ZOOM_END,
  GLOBE_START_CENTER,
  GLOBE_START_ZOOM,
  GLOBE_START_BEARING,
  SPILL_LOCATIONS
} from '../../data/demo'

// ── Interpolation helpers ─────────────────────────────────────────────────────
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}
function lerp(a, b, t) {
  return a + (b - a) * t
}
function getAngularDistance(lon1, lat1, lon2, lat2) {
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const rLat1 = lat1 * Math.PI / 180
  const rLat2 = lat2 * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return c * 180 / Math.PI
}

/**
 * Unified globe → map component.
 *
 * Renders a single MapLibre GL instance in globe projection.
 * `scrollProgress` (0→1) drives the camera from full-Earth orbit
 * down to a country-level view of the Gulf of Mexico.
 */
export function GlobeMapView({ scrollProgress = 0, onVesselSelect, selectedVesselId, onSpillHover, onSpillSelect, hasDetectionData }) {
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

  // Use refs for props to avoid stale closures in event listeners
  const scrollProgressRef = useRef(scrollProgress)
  const onSpillHoverRef = useRef(onSpillHover)
  const onSpillSelectRef = useRef(onSpillSelect)

  useEffect(() => {
    scrollProgressRef.current = scrollProgress
    onSpillHoverRef.current = onSpillHover
    onSpillSelectRef.current = onSpillSelect
  }, [scrollProgress, onSpillHover, onSpillSelect])

  // ── Target animation when detection data arrives ─────────────────────────
  useEffect(() => {
    if (hasDetectionData) {
      targetingRef.current = true
      const startLng = globeLngRef.current
      const startLat = globeLatRef.current
      
      // If we are crossing the date line, adjust targetLng to take the shortest path
      let targetLng = MAP_CENTER[0]
      if (Math.abs(startLng - targetLng) > 180) {
        if (startLng > targetLng) targetLng += 360
        else targetLng -= 360
      }
      
      const targetLat = MAP_CENTER[1]
      
      const startTime = Date.now()
      const duration = 2500 // 2.5s smooth pan
      
      const animateTarget = () => {
        const now = Date.now()
        let t = (now - startTime) / duration
        if (t > 1) t = 1
        const ease = easeOutCubic(t)
        
        let currentLng = lerp(startLng, targetLng, ease)
        if (currentLng > 180) currentLng -= 360
        else if (currentLng < -180) currentLng += 360
        
        globeLngRef.current = currentLng
        globeLatRef.current = lerp(startLat, targetLat, ease)
        
        if (t < 1) {
          requestAnimationFrame(animateTarget)
        } else {
          targetingRef.current = false
        }
      }
      
      requestAnimationFrame(animateTarget)
    }
  }, [hasDetectionData])

  // ── Initialise MapLibre with globe projection ──────────────────────────────
  useEffect(() => {
    let map = null
    const container = containerRef.current
    if (!container) return
    
    // ... rest of init
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
          wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:crosshair;pointer-events:auto;padding:10px;margin:-10px;'
          
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
          
          wrapper.__lbl = lbl
          wrapper.__spill = spill
          wrapper.__isSafe = true
          wrapper.__isHovered = false
          
          // Interactions
          wrapper.onmouseenter = () => {
            if (!wrapper.__isSafe) return
            wrapper.__isHovered = true
            hoverInteractingRef.current = true
            onSpillHoverRef.current?.(spill)
            dot.style.transform = 'scale(1.5)'
            dot.style.boxShadow = '0 0 30px #FFB000, 0 0 60px #FFB000'
          }
          wrapper.onmouseleave = () => {
            if (!wrapper.__isHovered) return
            wrapper.__isHovered = false
            hoverInteractingRef.current = false
            onSpillHoverRef.current?.(null)
            dot.style.transform = 'scale(1)'
            dot.style.boxShadow = '0 0 20px #FFB000, 0 0 40px #FFB000'
          }
          wrapper.onclick = (e) => {
            e.stopPropagation()
            if (!wrapper.__isSafe) return
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

        // ── Edge fade/suppress logic ───────────────────────────────────────
        map.on('render', () => {
          const center = map.getCenter()
          const safeRadius = 65 // degrees (start fading)
          const edgeRadius = 78 // degrees (completely faded, not interactable)

          Object.values(spillMarkersRef.current).forEach(marker => {
            const wrapper = marker.getElement()
            const spill = wrapper.__spill
            if (!spill) return
            
            const dist = getAngularDistance(center.lng, center.lat, spill.lon, spill.lat)
            
            // smoothstep from safeRadius to edgeRadius
            let t = (dist - safeRadius) / (edgeRadius - safeRadius)
            t = Math.max(0, Math.min(1, t))
            const opacity = 1 - (t * t * (3 - 2 * t))

            if (wrapper.__lbl) {
              wrapper.__lbl.style.opacity = opacity.toFixed(3)
            }
            
            const isSafe = dist <= edgeRadius
            if (isSafe !== wrapper.__isSafe) {
              wrapper.__isSafe = isSafe
              wrapper.style.pointerEvents = isSafe ? 'auto' : 'none'
              
              if (!isSafe && wrapper.__isHovered) {
                wrapper.onmouseleave()
              }
            }
          })
        })



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

        // ── Animate spill drift / expansion ──────────────────────────────
        const t0 = Date.now()
        const animSpill = () => {
          if (!mapRef.current) return
          const elapsed = (Date.now() - t0) / 1000
          const src = map.getSource('spill-poly')
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
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)
      Object.values(vesselMarkersRef.current).forEach((m) => m?.remove?.())
      Object.values(spillMarkersRef.current).forEach((m) => m?.remove?.())
      vesselMarkersRef.current = {}
      spillMarkersRef.current = {}
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
        // FIXED CAMERA MODE: spin the bearing clockwise
        if (!userInteractingRef.current) {
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

  // ── Vessel markers (only render once zoomed in enough) ─────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return

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
        })
      } else {
        vesselMarkersRef.current[v.id]?.setLngLat([v.lon, v.lat])
      }
    })
  }, [vessels, onVesselSelect, scrollProgress])

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
