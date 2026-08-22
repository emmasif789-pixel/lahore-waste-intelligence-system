import { scoreHotspot, severityMeta } from './priorityEngine'

export function buildAreaIndex(hotspots) {
  const byArea = {}
  for (const h of hotspots) {
    if (!byArea[h.area]) byArea[h.area] = []
    byArea[h.area].push(h)
  }
  return byArea
}

export function summarizeArea(areaName, hotspotsInArea) {
  const n = hotspotsInArea.length
  const avgRecurrence = Math.round(
    hotspotsInArea.reduce((s, h) => s + h.recurrence, 0) / n
  )
  const avgRecyclable = Math.round(
    hotspotsInArea.reduce((s, h) => s + h.recyclablePct, 0) / n
  )
  const criticalCount = hotspotsInArea.filter((h) => h.severity === 'critical').length
  const highCount = hotspotsInArea.filter((h) => h.severity === 'high').length
  const burningCount = hotspotsInArea.filter((h) => h.burning).length

  const scored = hotspotsInArea
    .map((h) => ({ ...h, priority: scoreHotspot(h).score }))
    .sort((a, b) => b.priority - a.priority)

  const nearbySet = new Set()
  hotspotsInArea.forEach((h) => (h.nearby || []).forEach((n) => nearbySet.add(n)))

  const explanation = buildExplanation(areaName, {
    n,
    avgRecurrence,
    avgRecyclable,
    criticalCount,
    highCount,
    burningCount,
    topScore: scored[0]?.priority ?? 0,
  })

  return {
    areaName,
    hotspotCount: n,
    avgRecurrence,
    avgRecyclable,
    criticalCount,
    highCount,
    burningCount,
    topHotspots: scored.slice(0, 3),
    allHotspots: scored,
    sensitiveFacilities: Array.from(nearbySet).slice(0, 6),
    explanation,
  }
}

function buildExplanation(areaName, s) {
  const parts = []
  if (s.criticalCount > 0) {
    parts.push(
      `${areaName} has ${s.criticalCount} critical-severity hotspot${s.criticalCount > 1 ? 's' : ''}, placing it in the top tier of city-wide risk.`
    )
  } else if (s.highCount > 0) {
    parts.push(`${areaName} has ${s.highCount} high-severity hotspot${s.highCount > 1 ? 's' : ''} that need attention this week.`)
  } else {
    parts.push(`${areaName} currently has no critical hotspots — priority sites here are moderate or low severity.`)
  }
  if (s.avgRecurrence >= 60) {
    parts.push(`Recurrence is high (${s.avgRecurrence}% average) — sites here re-accumulate after cleanup, suggesting a root-cause issue (e.g. missing collection point or informal dumping habit) rather than a one-off.`)
  } else if (s.avgRecurrence >= 35) {
    parts.push(`Recurrence is moderate (${s.avgRecurrence}% average).`)
  } else {
    parts.push(`Recurrence is low (${s.avgRecurrence}% average) — these appear to be isolated incidents.`)
  }
  if (s.burningCount > 0) {
    parts.push(`${s.burningCount} site${s.burningCount > 1 ? 's show' : ' shows'} open burning, which raises air-quality and health risk for nearby residents beyond the waste itself.`)
  }
  if (s.avgRecyclable >= 45) {
    parts.push(`${s.avgRecyclable}% of material here is recoverable on average — a materials recovery pass could meaningfully cut landfill volume.`)
  }
  return parts.join(' ')
}
