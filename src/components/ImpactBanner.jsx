import React, { useMemo } from 'react'

// Assumes an average hotspot represents ~180kg of accumulated waste based on
// typical informal dumping site volumes — this is an estimation model, not a
// measured figure, and is labeled as such in the UI.
const AVG_HOTSPOT_KG = 180

export default function ImpactBanner({ hotspots }) {
  const impact = useMemo(() => {
    const totalKg = hotspots.reduce((sum, h) => sum + AVG_HOTSPOT_KG * (h.reportsCount > 0 ? 1 : 0.5), 0)
    const recoverableKg = hotspots.reduce(
      (sum, h) => sum + AVG_HOTSPOT_KG * (h.recyclablePct / 100),
      0
    )
    const resolved = hotspots.filter((h) => h.status === 'resolved').length
    return {
      totalKg: Math.round(totalKg),
      recoverableKg: Math.round(recoverableKg),
      resolved,
    }
  }, [hotspots])

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(63,182,168,0.12), rgba(207,154,62,0.08))',
        border: '1px solid var(--panel-border-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 22px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        alignItems: 'center',
        marginBottom: 24,
      }}
    >
      <div style={{ flex: '1 1 240px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Estimated civic impact
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Based on tracked hotspots citywide, an estimated <strong style={{ color: 'var(--teal)' }}>{impact.recoverableKg.toLocaleString()} kg</strong> of material is recoverable through proper sorting instead of landfill disposal.
        </div>
      </div>
      <BigNumber value={impact.totalKg.toLocaleString()} unit="kg" label="Waste tracked citywide" />
      <BigNumber value={impact.recoverableKg.toLocaleString()} unit="kg" label="Recoverable if sorted" color="var(--teal)" />
      <BigNumber value={impact.resolved} unit="" label="Sites resolved" color="var(--sev-low)" />
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexBasis: '100%' }}>
        Estimation model based on typical dumping-site volumes — not a measured figure.
      </div>
    </div>
  )
}

function BigNumber({ value, unit, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: color || 'var(--text-primary)', lineHeight: 1 }}>
        {value}<span style={{ fontSize: 14, marginLeft: 3, fontWeight: 500 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}
