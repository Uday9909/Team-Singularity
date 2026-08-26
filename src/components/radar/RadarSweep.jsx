import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

// RadarSweep: absolutely-positioned SVG layer that rotates a conic wedge
// driven by anime.js. Exposes current angle via ref.

export const RadarSweep = forwardRef(function RadarSweep({ size = 520, onAngleUpdate }, ref) {
  const svgRef = useRef(null)
  const groupRef = useRef(null)
  const angleRef = useRef(0)
  const animRef = useRef(null)

  useImperativeHandle(ref, () => ({
    getCurrentAngle: () => angleRef.current,
  }))

  useEffect(() => {
    let cleanup = null

    const startSweep = async () => {
      const { createTimeline } = await import('animejs')

      const state = { angle: 0 }
      const tl = createTimeline({ loop: true })
      tl.add(state, {
        angle: 360,
        duration: 4500,
        ease: 'linear',
        onUpdate: () => {
          angleRef.current = state.angle % 360
          if (groupRef.current) {
            groupRef.current.setAttribute('transform', `rotate(${angleRef.current} ${size / 2} ${size / 2})`)
          }
          onAngleUpdate?.(angleRef.current)
        },
      })

      cleanup = () => tl.pause?.()
    }

    startSweep()
    return () => cleanup?.()
  }, [size, onAngleUpdate])

  const cx = size / 2
  const cy = size / 2
  const r = size / 2

  // SVG arc path for a ~45° wedge from 12 o'clock
  const sweepAngleDeg = 45
  const sweepRad = (sweepAngleDeg * Math.PI) / 180
  const x1 = cx + r * Math.sin(0)
  const y1 = cy - r * Math.cos(0)
  const x2 = cx + r * Math.sin(sweepRad)
  const y2 = cy - r * Math.cos(sweepRad)
  const arcPath = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`

  return (
    <svg
      ref={svgRef}
      id="radar-sweep-svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        borderRadius: '50%',
      }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="sweepGrad" cx="0%" cy="0%" r="100%">
          <stop offset="0%" stopColor="rgba(57,255,106,0.0)" />
          <stop offset="60%" stopColor="rgba(57,255,106,0.12)" />
          <stop offset="100%" stopColor="rgba(57,255,106,0.35)" />
        </radialGradient>
        {/* Clip to circle */}
        <clipPath id="radarCircleClip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      <g ref={groupRef} clipPath="url(#radarCircleClip)">
        {/* Sweep wedge */}
        <path d={arcPath} fill="url(#sweepGrad)" />
        {/* Leading edge — bright line */}
        <line
          x1={cx}
          y1={cy}
          x2={x1}
          y2={y1}
          stroke="var(--phosphor)"
          strokeWidth="1.5"
          strokeOpacity="0.7"
        />
      </g>

      {/* Static radar rings */}
      {[0.25, 0.5, 0.75, 1.0].map(fraction => (
        <circle
          key={fraction}
          cx={cx}
          cy={cy}
          r={r * fraction}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={fraction === 1.0 ? 1.5 : 0.75}
          strokeOpacity={fraction === 1.0 ? 0.8 : 0.35}
        />
      ))}

      {/* Crosshairs */}
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="var(--hairline)" strokeWidth="0.5" strokeOpacity="0.25" />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="var(--hairline)" strokeWidth="0.5" strokeOpacity="0.25" />

      {/* Cardinal labels */}
      {[
        { label: 'N', x: cx, y: cy - r + 16 },
        { label: 'E', x: cx + r - 14, y: cy + 4 },
        { label: 'S', x: cx, y: cy + r - 8 },
        { label: 'W', x: cx - r + 14, y: cy + 4 },
      ].map(({ label, x, y }) => (
        <text
          key={label}
          x={x}
          y={y}
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9"
          fill="var(--phosphor)"
          fillOpacity="0.5"
        >
          {label}
        </text>
      ))}
    </svg>
  )
})
