import React from 'react'
import Gauge from './Gauge'
import { scoreHotspot, recommendedAction, severityMeta } from '../lib/priorityEngine'

const TYPE_COLOR = {
  Organic: '#4fae64',
  Plastic: '#3fb6a8',
  Cardboard: '#cf9a3e',
  Metal: '#93a1af',
  Glass: '#6fb7e0',
  'E-waste': '#b06fe0',
  Construction: '#a98358',
  Hazardous: '#e4483a',
  'Mixed/Residual': '#e0b93c',
}

export default function HotspotDetail({ hotspot, onClose }) {
  if (!hotspot) return null
  const { score, breakdown } = scoreHotspot(hotspot)
  const action = recommendedAction(hotspot, score)
  const meta = severityMeta(hotspot.severity)
  const isHazardAction = action.label.toLowerCase().includes('hazard')

  return (
    <div className="slide-panel-backdrop" onClick={onClose}>
      <div className="slide-panel" onClick={(e) => e.stopPropagation()}>
        <div className="slide-panel-header">
          <div>
            <div className="severity-tag" style={{ background: meta.color + '26', color: meta.color }}>
              {meta.emoji} {meta.label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginTop: 8 }}>{hotspot.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {hotspot.area} · <span className="mono">{hotspot.id}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="slide-panel-body">
          <div className="section-label">Cleanup priority score</div>
          <div className="gauge-wrap">
            <Gauge score={score} />
            <div className="gauge-breakdown">
              <div>Severity <span className="v">{breakdown.severity}</span></div>
              <div>Recurrence <span className="v">{breakdown.recurrence}</span></div>
              <div>Proximity risk <span className="v">{breakdown.proximity}</span></div>
              <div>Waste risk <span className="v">{breakdown.wasteRisk}</span></div>
              <div>Hazard <span className="v">{breakdown.hazard}</span></div>
              <div>Trend <span className="v">{breakdown.trend}</span></div>
            </div>
          </div>

          <div className={`action-card ${isHazardAction ? 'hazard' : ''}`}>
            <div className="action-label">→ {action.label}</div>
            <div className="action-detail">{action.detail}</div>
          </div>

          <div className="section-label">Site data</div>
          <div className="data-row"><span className="k">Reports filed</span><span className="v">{hotspot.reportsCount}</span></div>
          <div className="data-row"><span className="k">Recurrence rate</span><span className="v">{hotspot.recurrence}%</span></div>
          <div className="data-row"><span className="k">Recyclable share (est.)</span><span className="v">{hotspot.recyclablePct}%</span></div>
          <div className="data-row"><span className="k">Open burning observed</span><span className="v">{hotspot.burning ? 'Yes ⚠️' : 'No'}</span></div>
          <div className="data-row"><span className="k">Status</span><span className="v">{hotspot.status.replace('_', ' ')}</span></div>
          <div className="data-row"><span className="k">Last reported</span><span className="v">{hotspot.lastReported}</span></div>

          <div className="section-label">Waste composition (est.)</div>
          {hotspot.wasteTypes.map((w) => (
            <div className="bar-row" key={w.type}>
              <div className="bar-label">{w.type}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${w.pct}%`, background: TYPE_COLOR[w.type] || 'var(--accent)' }} /></div>
              <div className="bar-pct">{w.pct}%</div>
            </div>
          ))}

          <div className="section-label">Report trend (last {hotspot.trend.length} periods)</div>
          <TrendSparkline trend={hotspot.trend} />

          <div className="section-label">Nearby sensitive facilities</div>
          <div className="chip-list">
            {hotspot.nearby.map((n) => (
              <span className="chip" key={n}>{n}</span>
            ))}
          </div>

          <div className="section-label">Environmental / public-health risk</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {hotspot.burning
              ? 'Open burning detected at this site — this releases particulate matter and toxic fumes, elevating respiratory risk for nearby residents beyond the waste accumulation itself.'
              : hotspot.recurrence > 60
              ? 'High recurrence suggests an unmanaged dumping pattern; standing waste attracts pests and can contaminate nearby soil/water if organic content decomposes untreated.'
              : 'Risk is currently contained to the immediate site; standard collection should prevent escalation.'}
          </div>

          <div style={{ marginTop: 18, fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            📍 {hotspot.lat.toFixed(4)}, {hotspot.lng.toFixed(4)} · Community-reported / demo dataset
          </div>
        </div>
      </div>
    </div>
  )
}

function TrendSparkline({ trend }) {
  const max = Math.max(...trend, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40 }}>
      {trend.map((v, i) => (
        <div
          key={i}
          title={`${v} reports`}
          style={{
            flex: 1,
            height: `${Math.max(8, (v / max) * 100)}%`,
            background: i === trend.length - 1 ? 'var(--accent)' : 'var(--panel-border)',
            borderRadius: 3,
          }}
        />
      ))}
    </div>
  )
}
