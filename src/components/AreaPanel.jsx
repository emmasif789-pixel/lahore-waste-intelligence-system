import React from 'react'
import { severityMeta } from '../lib/priorityEngine'

export default function AreaPanel({ areaNames, selectedArea, onSelectArea, summary, onSelectHotspot }) {
  return (
    <div className="area-panel-float">
      <div className="panel-header">
        <div className="panel-title">Area intelligence</div>
      </div>
      <div className="panel-body">
        <label className="field-label">Select area</label>
        <select className="area-select" value={selectedArea} onChange={(e) => onSelectArea(e.target.value)}>
          <option value="">All areas (city-wide)</option>
          {areaNames.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {summary && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <MiniStat label="Hotspots" value={summary.hotspotCount} />
              <MiniStat label="Recurring avg" value={`${summary.avgRecurrence}%`} />
              <MiniStat label="Recyclable avg" value={`${summary.avgRecyclable}%`} />
              <MiniStat label="Burning sites" value={summary.burningCount} warn={summary.burningCount > 0} />
            </div>

            <div className="section-label" style={{ marginTop: 0 }}>Why this area is a priority</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{summary.explanation}</div>

            <div className="section-label">Top priority sites</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {summary.topHotspots.map((h, i) => {
                const meta = severityMeta(h.severity)
                return (
                  <div
                    key={h.id}
                    onClick={() => onSelectHotspot(h)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--panel-2)',
                      border: '1px solid var(--panel-border-soft)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      cursor: 'pointer',
                      fontSize: 12.5,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>#{i + 1}</span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                    <span className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>{h.priority.toFixed(1)}</span>
                  </div>
                )
              })}
            </div>

            {summary.sensitiveFacilities.length > 0 && (
              <>
                <div className="section-label">Nearby sensitive facilities</div>
                <div className="chip-list">
                  {summary.sensitiveFacilities.map((f) => (
                    <span className="chip" key={f}>{f}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, warn }) {
  return (
    <div style={{ background: 'var(--panel-2)', border: '1px solid var(--panel-border-soft)', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: warn ? 'var(--sev-critical)' : 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}
