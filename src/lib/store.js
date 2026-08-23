import seedHotspots from '../data/hotspots.json'

const KEY = 'lwis_hotspots_v1'
const REPORTS_KEY = 'lwis_reports_v1'

export function loadHotspots() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    // ignore, fall through to seed
  }
  localStorage.setItem(KEY, JSON.stringify(seedHotspots))
  return seedHotspots
}

export function saveHotspots(hotspots) {
  localStorage.setItem(KEY, JSON.stringify(hotspots))
}

export function loadReports() {
  try {
    const raw = localStorage.getItem(REPORTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

export function saveReport(report) {
  const reports = loadReports()
  reports.unshift(report)
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports.slice(0, 200)))
}

export function updateHotspotStatus(hotspots, hotspotId, status) {
  return hotspots.map((h) => (h.id === hotspotId ? { ...h, status } : h))
}

export function resetDemoData() {
  localStorage.setItem(KEY, JSON.stringify(seedHotspots))
  localStorage.removeItem(REPORTS_KEY)
}

// Merge a new citizen report into the hotspot dataset: either bump an
// existing nearby hotspot's report count/recurrence/trend, or create a new one.
export function applyReportToHotspots(hotspots, report, nearestHotspotId) {
  const next = hotspots.map((h) => ({ ...h }))
  if (nearestHotspotId) {
    const idx = next.findIndex((h) => h.id === nearestHotspotId)
    if (idx !== -1) {
      const h = next[idx]
      h.reportsCount = (h.reportsCount || 0) + 1
      h.recurrence = Math.min(100, h.recurrence + 3)
      h.trend = [...(h.trend || []).slice(-5), h.reportsCount]
      h.lastReported = report.timestamp.slice(0, 10)
      if (report.analysis?.hazardIndicators?.length) h.burning = h.burning || report.analysis.hazardIndicators.some((x) => /burn/i.test(x))
      next[idx] = h
      return { hotspots: next, hotspotId: h.id, created: false }
    }
  }
  const newHotspot = {
    id: `LHR-${String(1000 + hotspots.length)}`,
    name: report.locationLabel || 'New citizen report',
    area: report.area || 'Unassigned',
    lat: report.lat,
    lng: report.lng,
    severity: report.analysis?.severity || 'moderate',
    wasteTypes: report.analysis?.categories || [],
    reportsCount: 1,
    recurrence: 15,
    recyclablePct: report.analysis?.recoverablePct ?? 20,
    burning: (report.analysis?.hazardIndicators || []).some((x) => /burn/i.test(x)),
    nearby: report.nearby || ['Reported location'],
    trend: [1],
    status: 'unresolved',
    lastReported: report.timestamp.slice(0, 10),
  }
  next.push(newHotspot)
  return { hotspots: next, hotspotId: newHotspot.id, created: true }
}
