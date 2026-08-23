// Cleanup Priority Score Engine
// Produces a 0-10 score from severity, recurrence, proximity to sensitive
// facilities, waste-type risk, hazard/burning indicators, and accumulation trend.
// Every weight below is intentionally exposed so the scoring is auditable,
// not a black box — this is meant to be defensible to a judge/city official.

const SEVERITY_POINTS = { critical: 3, high: 2.2, moderate: 1.2, low: 0.4 }

const RISKY_WASTE_TYPES = new Set(['Hazardous', 'E-waste', 'Construction'])

function trendSlope(trend = []) {
  if (trend.length < 2) return 0
  const first = trend[0] || 0
  const last = trend[trend.length - 1] || 0
  if (first === 0) return last > 0 ? 1 : 0
  return Math.max(0, (last - first) / Math.max(first, 1))
}

export function scoreHotspot(h) {
  const severityPts = SEVERITY_POINTS[h.severity] ?? 1

  const recurrencePts = (h.recurrence / 100) * 2 // up to 2.0

  const proximityHits = (h.nearby || []).filter((n) =>
    /school|home|residen|drain|nullah|hospital|clinic|market|shrine|park/i.test(n)
  ).length
  const proximityPts = Math.min(2, proximityHits * 0.6) // up to 2.0

  const riskyPct = (h.wasteTypes || [])
    .filter((w) => RISKY_WASTE_TYPES.has(w.type))
    .reduce((sum, w) => sum + w.pct, 0)
  const wasteRiskPts = Math.min(1, (riskyPct / 100) * 2.5) // up to 1.0

  const hazardPts = h.burning ? 1.3 : 0 // burning / open hazard

  const trendPts = Math.min(0.5, trendSlope(h.trend) * 0.5) // up to 0.5

  const raw = severityPts + recurrencePts + proximityPts + wasteRiskPts + hazardPts + trendPts
  const score = Math.min(10, Math.round(raw * 10) / 10)

  return {
    score,
    breakdown: {
      severity: round1(severityPts),
      recurrence: round1(recurrencePts),
      proximity: round1(proximityPts),
      wasteRisk: round1(wasteRiskPts),
      hazard: round1(hazardPts),
      trend: round1(trendPts),
    },
  }
}

function round1(n) {
  return Math.round(n * 10) / 10
}

export function recommendedAction(h, score) {
  if (h.burning || (h.wasteTypes || []).some((w) => w.type === 'Hazardous' && w.pct >= 15)) {
    return {
      label: 'Hazardous handling required',
      detail:
        'Dispatch a hazard-certified crew before general collection. Do not allow open burning to continue — flag to the environment/health desk in parallel with cleanup scheduling.',
    }
  }
  if (score >= 7.5) {
    return {
      label: 'Priority collection — dispatch within 24–48h',
      detail:
        'High recurrence and severity indicate this site will re-accumulate quickly. Schedule a collection crew and consider a temporary barrier or signage to deter re-dumping.',
    }
  }
  if (score >= 5) {
    const recyclable = h.recyclablePct ?? 0
    if (recyclable >= 45) {
      return {
        label: 'Scheduled collection + recovery routing',
        detail: `Recyclable share is high (${recyclable}%). Route recoverable material to a materials recovery facility instead of general landfill collection.`,
      }
    }
    return {
      label: 'Scheduled collection this week',
      detail: 'Moderate priority — add to the standard weekly collection route for this zone.',
    }
  }
  return {
    label: 'Monitor / routine sweep',
    detail: 'Low recurrence and severity. Include in routine area sweeps; no special dispatch needed.',
  }
}

export function severityMeta(severity) {
  const map = {
    critical: { label: 'Critical', color: '#E4483A', emoji: '🔴' },
    high: { label: 'High', color: '#E38A2E', emoji: '🟠' },
    moderate: { label: 'Moderate', color: '#E0B93C', emoji: '🟡' },
    low: { label: 'Low', color: '#4FAE64', emoji: '🟢' },
  }
  return map[severity] || map.moderate
}

export function riskBandFromScore(score) {
  if (score >= 7.5) return { label: 'Critical', color: '#E4483A' }
  if (score >= 5) return { label: 'High', color: '#E38A2E' }
  if (score >= 2.5) return { label: 'Moderate', color: '#E0B93C' }
  return { label: 'Low', color: '#4FAE64' }
}
