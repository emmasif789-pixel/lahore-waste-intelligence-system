import React from 'react'
import Gauge from './Gauge'
import { scoreHotspot, recommendedAction, severityMeta, riskBandFromScore } from '../lib/priorityEngine'

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

const STATUS_OPTIONS = [
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
]

export default function HotspotDetail({ hotspot, onClose, opsMode, onStatusChange }) {
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

          {opsMode && (
            <>
              <div className="section-label">City operations</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onStatusChange(hotspot.id, opt.value)}
                    style={{
                      flex: 1,
                      padding: '8px 6px',
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: hotspot.status === opt.value ? '1px solid var(--accent)' : '1px solid var(--panel-border)',
                      background: hotspot.status === opt.value ? 'var(--accent-soft)' : 'var(--panel-2)',
                      color: hotspot.status === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {hotspot.status === 'resolved' && hotspot.beforeSnapshot && (
            <ImpactVerification hotspot={hotspot} currentScore={score} />
          )}

          <div className="section-label">Site data</div>
          <div className="data-row"><span className="k">Reports filed</span><span className="v">{hotspot.reportsCount}</span></div>
          <div className="data-row"><span className="k">Recurrence rate</span><span className="v">{hotspot.recurrence}%</span></div>
          <div className="data-row"><span className="k">Recyclable share (est.)</span><span className="v">{hotspot.recyclablePct}%</span></div>
          <div className="data-row"><span className="k">Open burning observed</span><span className="v">{hotspot.burning ? 'Yes ⚠️' : 'No'}</span></div>
          <div className="data-row"><span className="k">Status</span><span className="v">{hotspot.status.replace('_', ' ')}</span></div>
          <div className="data-row"><span className="k">Last reported</span><span className="v">{hotspot.lastReported}</span></div>

          {hotspot.source && <SourceCitation source={hotspot.source} type={hotspot.type} />}

          <div className="section-label">Waste composition (est.)</div>
          {hotspot.wasteTypes.length === 0 ? (
            <div className="empty-note">No photo-based composition analysis yet for this site — submit a report to add one.</div>
          ) : (
            hotspot.wasteTypes.map((w) => (
              <div className="bar-row" key={w.type}>
                <div className="bar-label">{w.type}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${w.pct}%`, background: TYPE_COLOR[w.type] || 'var(--accent)' }} /></div>
                <div className="bar-pct">{w.pct}%</div>
              </div>
            ))
          )}

          <div className="section-label">Report trend (last {hotspot.trend.length} periods)</div>
          <TrendSparkline trend={hotspot.trend} />

          <div className="section-label">Nearby sensitive facilities</div>
          {hotspot.nearby.length === 0 ? (
            <div className="empty-note">No nearby facilities logged yet for this site.</div>
          ) : (
            <div className="chip-list">
              {hotspot.nearby.map((n) => (
                <span className="chip" key={n}>{n}</span>
              ))}
            </div>
          )}

          <div className="section-label">Environmental / public-health risk</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {hotspot.burning
              ? 'Open burning detected at this site — this releases particulate matter and toxic fumes, elevating respiratory risk for nearby residents beyond the waste accumulation itself.'
              : hotspot.recurrence > 60
              ? 'High recurrence suggests an unmanaged dumping pattern; standing waste attracts pests and can contaminate nearby soil/water if organic content decomposes untreated.'
              : 'Risk is currently contained to the immediate site; standard collection should prevent escalation.'}
          </div>

          <div style={{ marginTop: 18, fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            📍 {hotspot.lat.toFixed(4)}, {hotspot.lng.toFixed(4)} · {hotspot.source ? 'Sourced from public reporting — see citation above' : 'Community-reported / demo dataset'}
          </div>
        </div>
      </div>
    </div>
  )
}

function ImpactVerification({ hotspot, currentScore }) {
  const before = hotspot.beforeSnapshot
  const beforeBand = riskBandFromScore(before.priorityScore)
  const afterBand = riskBandFromScore(currentScore)

  return (
    <div style={{ marginTop: 4 }}>
      <div className="section-label">📸 Impact verification</div>
      <div
        style={{
          background: 'var(--sev-low-soft)',
          border: '1px solid rgba(79,174,100,0.35)',
          borderRadius: 'var(--radius-md)',
          padding: 14,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
          <ImpactColumn
            label="BEFORE cleanup"
            recurrence={before.recurrence}
            risk={beforeBand}
            burning={before.burning}
          />
          <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>→</div>
          <ImpactColumn
            label="AFTER cleanup"
            recurrence={hotspot.recurrence}
            risk={afterBand}
            burning={hotspot.burning}
            highlight
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
          Recurrence and hazard status reset when this site was marked resolved on {before.capturedAt?.slice(0, 10)}. Future reports at this location will show whether the improvement holds.
        </div>
      </div>
    </div>
  )
}

function ImpactColumn({ label, recurrence, risk, burning, highlight }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: highlight ? 'var(--sev-low)' : 'var(--text-primary)' }}>
        {recurrence}%
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4 }}>recurrence</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: risk.color }}>{risk.label} risk</div>
      {burning && <div style={{ fontSize: 10, color: 'var(--sev-critical)', marginTop: 2 }}>🔥 burning</div>}
    </div>
  )
}

function SourceCitation({ source, type }) {
  const urlMatch = source.match(/https?:\/\/[^\s)]+/)
  const url = urlMatch ? urlMatch[0] : null
  const textWithoutUrl = url ? source.replace(url, '').trim() : source

  return (
    <div style={{ marginTop: 4 }}>
      <div className="section-label">✅ Verified source</div>
      <div
        style={{
          background: 'var(--teal-soft)',
          border: '1px solid rgba(63,182,168,0.35)',
          borderRadius: 'var(--radius-md)',
          padding: 12,
        }}
      >
        {type && (
          <span className="chip" style={{ marginBottom: 8, display: 'inline-block' }}>
            {type.replace(/_/g, ' ')}
          </span>
        )}
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {textWithoutUrl}
          {url && (
            <>
              {' '}
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', textDecoration: 'underline' }}>
                View source →
              </a>
            </>
          )}
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
