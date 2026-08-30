import lahoreDensity from '../data/lahoreDensity.json'
import { haversineKm } from './geo'

// Assigns each hotspot to its geographically nearest tehsil (real PBS Census
// 2023 population centers), then compares citizen reporting volume against
// population to surface areas that are likely under-reported rather than
// genuinely clean. This combines two independently-sourced real datasets —
// it does not invent any numbers of its own.
export function computeTehsilStats(hotspots) {
  const tehsils = lahoreDensity.tehsilPoints.map((t) => ({
    ...t,
    hotspotCount: 0,
    reportCount: 0,
  }))

  hotspots.forEach((h) => {
    let nearest = null
    let bestDist = Infinity
    tehsils.forEach((t) => {
      const d = haversineKm({ lat: h.lat, lng: h.lng }, { lat: t.lat, lng: t.lng })
      if (d < bestDist) {
        bestDist = d
        nearest = t
      }
    })
    if (nearest) {
      nearest.hotspotCount += 1
      nearest.reportCount += h.reportsCount || 0
    }
  })

  tehsils.forEach((t) => {
    t.reportsPerMillion = t.reportCount / (t.population_2023 / 1_000_000)
  })

  const avgReportsPerMillion =
    tehsils.reduce((s, t) => s + t.reportsPerMillion, 0) / tehsils.length

  tehsils.forEach((t) => {
    // Flagged when reporting volume is less than half the citywide average
    // relative to population — the same "explainable threshold" philosophy
    // as the cleanup priority engine, not an opaque cutoff.
    t.isUnderMonitored = t.reportsPerMillion < avgReportsPerMillion * 0.5
  })

  return tehsils.sort((a, b) => a.reportsPerMillion - b.reportsPerMillion)
}

export function describeUnderMonitoredAreas(hotspots) {
  const stats = computeTehsilStats(hotspots)
  const flagged = stats.filter((t) => t.isUnderMonitored)

  if (flagged.length === 0) {
    return 'No area currently shows a significant reporting gap relative to its population — citizen reports are reasonably distributed across tehsils given their population sizes.'
  }

  const parts = flagged.map((t) => {
    const reportsPart =
      t.reportCount === 0
        ? 'zero citizen reports on file'
        : `only ${t.reportCount} report${t.reportCount === 1 ? '' : 's'} on file`
    return `${t.name} has ${reportsPart} despite a population of ${t.population_2023.toLocaleString()} — and the Urban Unit's 2025 estimate puts its waste generation at roughly ${t.estimated_waste_tpd.toLocaleString()} tonnes/day, which doesn't line up with almost no reporting activity.`
  })

  return `${parts.join(' ')} This gap likely reflects under-reporting rather than genuinely lower waste levels — a signal that outreach or a local reporting drive could matter as much as cleanup capacity here.`
}
