import { scoreHotspot, recommendedAction } from './priorityEngine'

export function exportCleanupReportCSV(hotspots) {
  const scored = hotspots
    .map((h) => {
      const { score } = scoreHotspot(h)
      const action = recommendedAction(h, score)
      return { ...h, priority: score, actionLabel: action.label }
    })
    .sort((a, b) => b.priority - a.priority)

  const headers = [
    'Rank', 'ID', 'Site name', 'Area', 'Severity', 'Priority score',
    'Recurrence %', 'Recyclable %', 'Burning/hazard', 'Reports filed',
    'Status', 'Last reported', 'Recommended action',
  ]

  const rows = scored.map((h, i) => [
    i + 1,
    h.id,
    csvSafe(h.name),
    csvSafe(h.area),
    h.severity,
    h.priority.toFixed(1),
    h.recurrence,
    h.recyclablePct,
    h.burning ? 'Yes' : 'No',
    h.reportsCount,
    h.status.replace('_', ' '),
    h.lastReported,
    csvSafe(h.actionLabel),
  ])

  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `lwis-cleanup-priority-report-${dateStr}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function csvSafe(str) {
  const s = String(str ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
