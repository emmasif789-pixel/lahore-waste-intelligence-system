import React, { useMemo } from 'react'
import { scoreHotspot } from '../lib/priorityEngine'
import { useCountUp } from '../lib/useCountUp'

// Four derived, explainable city-health metrics — deliberately not a chart.
// Each is computed directly from the same hotspot data driving the rest of
// the app, so there's no separate "black box" health score.
export default function CityHealth({ hotspots }) {
  const metrics = useMemo(() => {
    const n = hotspots.length || 1
    const avgPriority = hotspots.reduce((s, h) => s + scoreHotspot(h).score, 0) / n
    const wasteRisk = Math.round((avgPriority / 10) * 100)
    const burningPct = Math.round((hotspots.filter((h) => h.burning).length / n) * 100)
    const recyclingPotential = Math.round(hotspots.reduce((s, h) => s + h.recyclablePct, 0) / n)
    const resolutionRate = Math.round((hotspots.filter((h) => h.status === 'resolved').length / n) * 100)
    return { wasteRisk, burningPct, recyclingPotential, resolutionRate }
  }, [hotspots])

  return (
    <div style={{ marginBottom: 8 }}>
      <div className="section-heading">🩺 City health</div>
      <div className="section-caption">A snapshot of overall waste risk and recovery across every tracked site.</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 26,
        }}
      >
        <HealthMetric
          label="Waste risk"
          value={metrics.wasteRisk}
          tone={metrics.wasteRisk >= 60 ? 'critical' : metrics.wasteRisk >= 35 ? 'high' : 'low'}
          detail="Citywide average priority score, normalized to 100"
        />
        <HealthMetric
          label="Burning risk"
          value={metrics.burningPct}
          tone={metrics.burningPct >= 30 ? 'critical' : metrics.burningPct >= 10 ? 'high' : 'low'}
          detail="Share of hotspots with active burning indicators"
        />
        <HealthMetric
          label="Recycling potential"
          value={metrics.recyclingPotential}
          tone="teal"
          detail="Average recoverable material share"
        />
        <HealthMetric
          label="Resolution rate"
          value={metrics.resolutionRate}
          tone="low"
          detail="Hotspots marked resolved by city ops"
        />
      </div>
    </div>
  )
}

const TONE_COLOR = {
  critical: 'var(--sev-critical)',
  high: 'var(--sev-high)',
  low: 'var(--sev-low)',
  teal: 'var(--teal)',
}

function HealthMetric({ label, value, tone, detail }) {
  const animated = useCountUp(value)
  const color = TONE_COLOR[tone] || 'var(--text-primary)'
  return (
    <div
      className="health-metric-card"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--panel-border-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        transition: 'border-color 0.2s, transform 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color }}>
          {Math.round(animated)}%
        </div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{detail}</div>
      <div style={{ height: 4, background: 'var(--panel-2)', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, animated)}%`, background: color, borderRadius: 4, transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  )
}
