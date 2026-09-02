import { useState, useEffect, useRef } from 'react'
import { INITIAL_VESSELS } from '../data/demo'

// Knots → degrees per second at given lat
// 1 knot ≈ 0.000277778° longitude/second at equator, adjusted for lat
const KN_TO_DEG_PER_MS = 0.000277778 / 1000 // °/ms at equator

export function useVesselSimulation(intervalMs = 3000) {
  const [vessels, setVessels] = useState(() =>
    INITIAL_VESSELS.map(v => ({ ...v }))
  )
  const vesselRef = useRef(vessels)

  useEffect(() => {
    vesselRef.current = vessels
  }, [vessels])

  useEffect(() => {
    const tick = () => {
      setVessels(prev =>
        prev.map(v => {
          // Convert heading to radians (0=N, clockwise)
          const headRad = (v.heading * Math.PI) / 180
          // deltaT in ms (interval)
          const dt = intervalMs
          const dist = v.speed * KN_TO_DEG_PER_MS * dt

          // Small jitter ±5° on heading per step
          const jitter = (Math.random() - 0.5) * 10
          const newHeading = ((v.heading + jitter + 360) % 360)
          const newHeadRad = (newHeading * Math.PI) / 180

          const dLon = dist * Math.sin(newHeadRad)
          const dLat = dist * Math.cos(newHeadRad)

          return {
            ...v,
            heading: newHeading,
            lat: v.lat + dLat,
            lon: v.lon + dLon,
          }
        })
      )
    }

    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return vessels
}
