import { useEffect, useRef } from 'react'
import { SYSTEM_STATS } from '../../data/demo'
import { useReducedMotion } from '../../hooks/useReducedMotion'

const STATS = [
  { label: 'IoU Score', value: SYSTEM_STATS.iou, suffix: '', decimals: 3, id: 'stat-iou' },
  { label: 'Vessels Tracked', value: SYSTEM_STATS.vessels, suffix: '', decimals: 0, id: 'stat-vessels' },
  { label: 'Detect → Correlate', value: SYSTEM_STATS.detectTime, suffix: 's', decimals: 1, id: 'stat-time' },
]

export function StatStrip() {
  const refs = useRef([])
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) {
      // Just set final values
      refs.current.forEach((el, i) => {
        if (!el) return
        const s = STATS[i]
        el.textContent = s.value.toFixed(s.decimals) + s.suffix
      })
      return
    }

    const startAnimation = async () => {
      const { animate } = await import('animejs')
      STATS.forEach((stat, i) => {
        const el = refs.current[i]
        if (!el) return
        const obj = { val: 0 }
        animate(obj, {
          val: stat.value,
          duration: 2000,
          delay: 400 + i * 200,
          ease: 'outExpo',
          onUpdate: () => {
            el.textContent = obj.val.toFixed(stat.decimals) + stat.suffix
          },
        })
      })
    }
    startAnimation()
  }, [reducedMotion])

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-0 w-full max-w-xl mx-auto"
      style={{
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(11,15,10,0.65)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {STATS.map((stat, i) => (
        <div
          key={stat.id}
          className="flex-1 flex flex-col items-center py-4 px-6 w-full"
          style={{
            borderRight: i < STATS.length - 1 ? '1px solid var(--hairline)' : 'none',
            borderBottom: 'none',
          }}
        >
          <span
            id={stat.id}
            ref={el => refs.current[i] = el}
            className="font-display font-bold"
            style={{ fontSize: '1.8rem', color: 'var(--phosphor)', lineHeight: 1, textShadow: '0 0 16px rgba(57,255,106,0.55)' }}
          >
            {reducedMotion ? stat.value.toFixed(stat.decimals) + stat.suffix : '0' + stat.suffix}
          </span>
          <span
            className="font-mono text-xs mt-1.5 tracking-widest uppercase"
            style={{ color: 'var(--bone)', opacity: 0.4 }}
          >
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  )
}
