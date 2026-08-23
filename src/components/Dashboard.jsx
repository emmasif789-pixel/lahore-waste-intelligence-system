import React, { useMemo } from 'react'
import { scoreHotspot, severityMeta } from '../lib/priorityEngine'
import ImpactBanner from './ImpactBanner'

export default function Dashboard({ hotspots, onSelectHotspot }) {
  const scored = useMemo(
    () => hotspots.map((h) => ({ ...h, priority: scoreHotspot(h).score })).sort((a, b) => b.priority - a.priority),
    [hotspots]
  )

  const total = hotspots.length
  const highPriority = hotspots.filter((h) => h.severity === 'critical' || h.severity === 'high').length
  const avgRecyclable = Math.round(hotspots.reduce((s, h) => s + h.recyclablePct, 0) / (total || 1))
  const recurring = hotspots.filter((h) => h.recurrence >= 50).length
  const burning = hotspots.filter((h) => h.burning).length
  const totalReports = hotspots.reduce((s, h) => s + h.reportsCount, 0)

  const cleanFirst = scored.slice(0, 5)

  return (
    <div className="dashboard">
      <ImpactBanner hotspots={hotspots} />
      <div className="dashboard-grid">
        <BigStat icon="🗺️" value={total} caption="Total hotspots tracked" />
        <BigStat icon="🚨" value={highPriority} caption="High-priority sites" accent="var(--sev-high)" />
        <BigStat icon="♻️" value={`${avgRecyclable}%`} caption="Avg. recyclable share" accent="var(--teal)" />
        <BigStat icon="🔁" value={recurring} caption="Recurring locations (50%+)" />
        <BigStat icon="🔥" value={burning} caption="Burning / hazard hotspots" accent="var(--sev-critical)" />
        <BigStat icon="📝" value={totalReports} caption="Total citizen reports" />
      </div>

      <div className="section-heading">🎯 Clean these locations first</div>
      <div className="section-caption">Ranked by the Cleanup Priority Engine — severity, recurrence, proximity to sensitive sites, waste risk, and hazard indicators.</div>
      <div className="priority-list">
        {cleanFirst.map((h, i) => {
          const meta = severityMeta(h.severity)
          return (
            <div className="priority-row" key={h.id} onClick={() => onSelectHotspot(h)}>
              <span className="rank mono">#{i + 1}</span>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
              <div className="info">
                <div className="name">{h.name}</div>
                <div className="meta">{h.area} · {meta.label} · {h.recurrence}% recurring · {h.reportsCount} reports</div>
              </div>
              <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>{h.priority.toFixed(1)}</span>
            </div>
          )
        })}
      </div>

      <div className="section-heading">📋 All hotspots</div>
      <div className="section-caption">Full city-wide dataset. Click any row for full intelligence.</div>
      <div className="table-wrap">
        <table className="hs-table">
          <thead>
            <tr>
              <th>Site</th>
              <th>Area</th>
              <th>Severity</th>
              <th>Recurrence</th>
              <th>Recyclable</th>
              <th>Reports</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {scored.map((h) => {
              const meta = severityMeta(h.severity)
              return (
                <tr key={h.id} onClick={() => onSelectHotspot(h)}>
                  <td>{h.name}</td>
                  <td>{h.area}</td>
                  <td><span className="severity-tag" style={{ background: meta.color + '26', color: meta.color }}>{meta.emoji} {meta.label}</span></td>
                  <td className="mono">{h.recurrence}%</td>
                  <td className="mono">{h.recyclablePct}%</td>
                  <td className="mono">{h.reportsCount}</td>
                  <td className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>{h.priority.toFixed(1)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{h.status.replace('_', ' ')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 18, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        Community-reported / demo dataset — not live municipal data.
      </div>
    </div>
  )
}

function BigStat({ icon, value, caption, accent }) {
  return (
    <div className="big-stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-num" style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="stat-caption">{caption}</div>
    </div>
  )
}
