import React, { useMemo, useState } from 'react'
import { scoreHotspot, recommendedAction, severityMeta } from '../lib/priorityEngine'
import { describeUnderMonitoredAreas } from '../lib/densityInsight'

// Every insight here is computed directly from the live hotspot dataset —
// there is no separate AI call or fabricated narrative. This panel exists to
// surface the same intelligence the map/dashboard already contain, framed as
// direct answers to the questions a city operations lead actually asks.
export default function CityIntelligence({ hotspots, selectedHotspot, onClose, onSelectHotspot }) {
  const scored = useMemo(
    () => hotspots.map((h) => ({ ...h, priority: scoreHotspot(h).score })).sort((a, b) => b.priority - a.priority),
    [hotspots]
  )

  const todaysPriorities = scored.slice(0, 3)
  const focusHotspot = selectedHotspot
    ? scored.find((h) => h.id === selectedHotspot.id) || scored[0]
    : scored[0]

  const emerging = useMemo(
    () =>
      scored.filter((h) => {
        const t = h.trend || []
        if (t.length < 2) return false
        const last = t[t.length - 1]
        const prev = t[t.length - 2]
        return last > prev && h.status !== 'resolved'
      }).slice(0, 4),
    [scored]
  )

  const newThisPeriod = scored.filter((h) => h.reportsCount === 1)
  const resolvedThisPeriod = scored.filter((h) => h.status === 'resolved')
  const risingCount = emerging.length

  return (
    <div className="slide-panel-backdrop" onClick={onClose}>
      <div className="slide-panel intel-panel" onClick={(e) => e.stopPropagation()}>
        <div className="slide-panel-header">
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="intel-sparkle">✦</span> City Intelligence
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Computed live from tracked hotspot data</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="slide-panel-body">
          <IntelSection title="Ask a question" icon="💬">
            <RecommendedQA hotspots={hotspots} scored={scored} areas={[...new Set(hotspots.map((h) => h.area))]} />
          </IntelSection>

          <IntelSection title="Today's priorities" icon="🎯">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todaysPriorities.map((h, i) => {
                const meta = severityMeta(h.severity)
                return (
                  <div key={h.id} className="intel-row" onClick={() => onSelectHotspot(h)}>
                    <span className="mono" style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                    <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>{h.priority.toFixed(1)}</span>
                  </div>
                )
              })}
            </div>
          </IntelSection>

          {focusHotspot && (
            <IntelSection title="Why is this hotspot critical?" icon="❓">
              <div className="intel-focus-name">{focusHotspot.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                {explainCriticality(focusHotspot)}
              </div>
            </IntelSection>
          )}

          {focusHotspot && (
            <IntelSection title="Where should we dispatch?" icon="🚚">
              {(() => {
                const action = recommendedAction(focusHotspot, focusHotspot.priority)
                return (
                  <div className={`action-card ${action.label.toLowerCase().includes('hazard') ? 'hazard' : ''}`} style={{ marginTop: 0 }}>
                    <div className="action-label" style={{ fontSize: 13 }}>→ {action.label}</div>
                    <div className="action-detail" style={{ fontSize: 12 }}>{action.detail}</div>
                  </div>
                )
              })()}
            </IntelSection>
          )}

          <IntelSection title="Emerging hotspots" icon="📈">
            {emerging.length === 0 ? (
              <div className="empty-note">No sites are currently trending upward.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {emerging.map((h) => (
                  <div key={h.id} className="intel-row" onClick={() => onSelectHotspot(h)}>
                    <span style={{ fontSize: 13 }}>📈</span>
                    <span style={{ flex: 1, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--sev-high)' }}>rising</span>
                  </div>
                ))}
              </div>
            )}
          </IntelSection>

          <IntelSection title="What changed this week" icon="🗓️">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              <ChangeLine icon="🆕" text={`${newThisPeriod.length} new site${newThisPeriod.length === 1 ? '' : 's'} reported`} />
              <ChangeLine icon="📈" text={`${risingCount} site${risingCount === 1 ? '' : 's'} trending upward`} />
              <ChangeLine icon="✅" text={`${resolvedThisPeriod.length} site${resolvedThisPeriod.length === 1 ? '' : 's'} marked resolved`} />
            </div>
          </IntelSection>
        </div>
      </div>
    </div>
  )
}

function IntelSection({ title, icon, children }) {
  return (
    <div className="intel-section">
      <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 0 }}>
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  )
}

function ChangeLine({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{icon}</span> <span>{text}</span>
    </div>
  )
}

function explainCriticality(h) {
  const parts = []
  const meta = severityMeta(h.severity)
  parts.push(`${meta.label} severity with a priority score of ${h.priority.toFixed(1)}/10.`)
  if (h.recurrence >= 60) parts.push(`Recurrence is high at ${h.recurrence}%, meaning this site re-accumulates quickly after cleanup.`)
  if (h.burning) parts.push('Active burning indicators raise both environmental and public-health risk beyond the waste itself.')
  const sensitiveNearby = (h.nearby || []).filter((n) => /school|home|residen|drain|hospital|clinic/i.test(n))
  if (sensitiveNearby.length > 0) parts.push(`It sits near ${sensitiveNearby.length} sensitive facilit${sensitiveNearby.length > 1 ? 'ies' : 'y'}: ${sensitiveNearby.join(', ')}.`)
  return parts.join(' ')
}

// Fixed, deterministic Q&A — every answer is computed directly from the live
// hotspot dataset, not generated text. No AI call, no risk of a wrong answer
// during a live demo.
function RecommendedQA({ hotspots, scored, areas }) {
  const [openId, setOpenId] = useState(null)

  const areaRisk = useMemo(() => {
    const byArea = {}
    hotspots.forEach((h) => {
      if (!byArea[h.area]) byArea[h.area] = []
      byArea[h.area].push(h)
    })
    let worst = null
    for (const [area, list] of Object.entries(byArea)) {
      const avg = list.reduce((s, h) => s + scoreHotspot(h).score, 0) / list.length
      if (!worst || avg > worst.avg) worst = { area, avg, count: list.length }
    }
    return worst
  }, [hotspots])

  const questions = [
    {
      id: 'clean-first',
      q: 'What should we clean first?',
      a: () => {
        const top = scored[0]
        if (!top) return 'No hotspots tracked yet.'
        return `${top.name} in ${top.area} — priority score ${top.priority.toFixed(1)}/10. ${recommendedAction(top, top.priority).detail}`
      },
    },
    {
      id: 'riskiest-area',
      q: 'Which area is most at risk?',
      a: () => {
        if (!areaRisk) return 'Not enough data yet.'
        return `${areaRisk.area} has the highest average priority score citywide (${areaRisk.avg.toFixed(1)}/10 across ${areaRisk.count} tracked site${areaRisk.count > 1 ? 's' : ''}).`
      },
    },
    {
      id: 'dispatch-today',
      q: 'Where should crews be dispatched today?',
      a: () => {
        const urgent = scored.filter((h) => h.priority >= 7.5 && h.status !== 'resolved').slice(0, 3)
        if (urgent.length === 0) return 'No sites currently exceed the urgent-dispatch threshold (7.5/10).'
        return `${urgent.length} site${urgent.length > 1 ? 's' : ''} need dispatch within 24–48h: ${urgent.map((h) => h.name).join(', ')}.`
      },
    },
    {
      id: 'recovery-potential',
      q: "What's our best recovery opportunity?",
      a: () => {
        const best = [...hotspots].sort((a, b) => b.recyclablePct - a.recyclablePct)[0]
        if (!best) return 'No data yet.'
        return `${best.name} in ${best.area} has the highest recoverable share at ${best.recyclablePct}% — a strong candidate for materials recovery instead of landfill routing.`
      },
    },
    {
      id: 'under-monitored',
      q: 'Which populated areas are under-monitored?',
      a: () => describeUnderMonitoredAreas(hotspots),
    },
  ]

  return (
    <div>
      {questions.map((item) => (
        <div key={item.id}>
          <button className="intel-question-btn" onClick={() => setOpenId(openId === item.id ? null : item.id)}>
            {item.q} {openId === item.id ? '▲' : '▼'}
          </button>
          {openId === item.id && <div className="intel-answer-box">{item.a()}</div>}
        </div>
      ))}
    </div>
  )
}
