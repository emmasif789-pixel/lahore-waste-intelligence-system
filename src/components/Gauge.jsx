import React from 'react'

// The signature instrument of the app: an analog-meter style gauge for the
// Cleanup Priority Score. Reused on hotspot cards, the detail panel, and the
// report result screen so the score always reads the same way.
export default function Gauge({ score = 0, size = 84 }) {
  const pct = Math.max(0, Math.min(10, score)) / 10
  const startAngle = -125
  const endAngle = 125
  const angle = startAngle + (endAngle - startAngle) * pct

  const color =
    score >= 7.5 ? 'var(--sev-critical)' : score >= 5 ? 'var(--sev-high)' : score >= 2.5 ? 'var(--sev-moderate)' : 'var(--sev-low)'

  const r = 34
  const cx = 40
  const cy = 40

  const polar = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const arcPath = (a1, a2) => {
    const p1 = polar(a1)
    const p2 = polar(a2)
    const largeArc = a2 - a1 > 180 ? 1 : 0
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`
  }

  const needle = polar(angle)
  const ticks = Array.from({ length: 11 }, (_, i) => startAngle + ((endAngle - startAngle) * i) / 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 80 80" className="gauge-svg">
        <path d={arcPath(startAngle, endAngle)} stroke="var(--panel-border)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d={arcPath(startAngle, angle)} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" className="gauge-arc" />
        {ticks.map((t, i) => {
          const p1 = polar(t)
          const rad = ((t - 90) * Math.PI) / 180
          const p2 = { x: cx + (r - 8) * Math.cos(rad), y: cy + (r - 8) * Math.sin(rad) }
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--panel-border)" strokeWidth="1.5" />
        })}
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={color} strokeWidth="2" strokeLinecap="round" className="gauge-needle" />
        <circle cx={cx} cy={cy} r="3" fill={color} />
        <text x="40" y="44" textAnchor="middle" fontFamily="var(--font-display)" fontSize="17" fontWeight="700" fill="var(--text-primary)">
          {score.toFixed(1)}
        </text>
      </svg>
    </div>
  )
}
