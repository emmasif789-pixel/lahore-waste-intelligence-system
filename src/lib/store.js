import seedHotspots from '../data/hotspots.json'
import { scoreHotspot } from './priorityEngine'
import { supabase } from './supabaseClient'

const REPORTS_LOCAL_KEY = 'lwis_reports_cache_v1' // small local cache of recent reports for the report-history UI, not the source of truth

// --- field mapping between app shape (camelCase) and DB shape (snake_case) ---

function rowToHotspot(row) {
  return {
    id: row.id,
    name: row.name,
    area: row.area,
    lat: row.lat,
    lng: row.lng,
    severity: row.severity,
    wasteTypes: row.waste_types || [],
    reportsCount: row.reports_count,
    recurrence: row.recurrence,
    recyclablePct: row.recyclable_pct,
    burning: row.burning,
    nearby: row.nearby || [],
    trend: row.trend || [],
    status: row.status,
    lastReported: row.last_reported,
    beforeSnapshot: row.before_snapshot || null,
    source: row.source || null,
    type: row.type || null,
  }
}

function hotspotToRow(h) {
  return {
    id: h.id,
    name: h.name,
    area: h.area,
    lat: h.lat,
    lng: h.lng,
    severity: h.severity,
    waste_types: h.wasteTypes || [],
    reports_count: h.reportsCount || 0,
    recurrence: h.recurrence || 0,
    recyclable_pct: h.recyclablePct || 0,
    burning: !!h.burning,
    nearby: h.nearby || [],
    trend: h.trend || [],
    status: h.status || 'unresolved',
    last_reported: h.lastReported || null,
    before_snapshot: h.beforeSnapshot || null,
    source: h.source || null,
    type: h.type || null,
  }
}

// --- hotspots ---


export async function loadHotspots() {
  try {
    const { data, error } = await supabase.from('hotspots').select('*').order('id')
    if (error) throw error

    if (!data || data.length === 0) {
      // First run against a fresh database — seed it once from the demo dataset.
      const rows = seedHotspots.map(hotspotToRow)
      const { error: insertError } = await supabase.from('hotspots').insert(rows)
      if (insertError) throw insertError
      return seedHotspots
    }

    // The seed dataset can change between deployments (e.g. swapping in a
    // researched, cited dataset that happens to reuse the same LHR-00N id
    // scheme as an older seed). ID overlap alone can't detect that swap, so
    // compare actual content: if the row for the seed's first id doesn't
    // match that seed entry's name, the database is running stale seed data
    // from an earlier version and needs a full resync.
    const anchor = seedHotspots[0]
    const dbAnchorRow = data.find((r) => r.id === anchor.id)
    const looksStale = !dbAnchorRow || dbAnchorRow.name !== anchor.name

    if (looksStale) {
      // Only clear the seed-id rows themselves — never touch rows with other
      // ids, since those are real citizen-submitted hotspots and must survive
      // a seed-data resync.
      await supabase.from('hotspots').delete().in('id', seedHotspots.map((h) => h.id))
      const rows = seedHotspots.map(hotspotToRow)
      const { error: reseedError } = await supabase.from('hotspots').insert(rows)
      if (reseedError) throw reseedError
      const { data: fresh } = await supabase.from('hotspots').select('*').order('id')
      return fresh ? fresh.map(rowToHotspot) : seedHotspots
    }

    return data.map(rowToHotspot)
  } catch (err) {
    console.error('Supabase load failed, falling back to local demo data:', err)
    return seedHotspots
  }
}

export async function upsertHotspot(hotspot) {
  try {
    const { error } = await supabase.from('hotspots').upsert(hotspotToRow(hotspot))
    if (error) throw error
    return true
  } catch (err) {
    console.error('Supabase upsert failed:', err)
    return false
  }
}

export function updateHotspotStatus(hotspots, hotspotId, status) {
  return hotspots.map((h) => {
    if (h.id !== hotspotId) return h
    // When a site is resolved for the first time, snapshot its pre-cleanup
    // state so Impact Verification can show a real before/after comparison.
    // Recurrence and burning reset to reflect that a cleanup actually
    // occurred — this is an operational state transition, not a fabricated
    // improvement claim.
    if (status === 'resolved' && h.status !== 'resolved') {
      const before = {
        reportsCount: h.reportsCount,
        recurrence: h.recurrence,
        burning: h.burning,
        priorityScore: scoreHotspot(h).score,
        capturedAt: new Date().toISOString(),
      }
      return { ...h, status, beforeSnapshot: before, recurrence: 0, burning: false, trend: [...(h.trend || []).slice(-5), 0] }
    }
    return { ...h, status }
  })
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
    id: `LHR-${Date.now()}`,
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

// --- reports ---

// Uploads a captured report photo to the public report-photos bucket and
// returns its public URL, or null if there's no photo blob or the upload
// fails (upload failure shouldn't block the report itself from saving).
async function uploadReportPhoto(reportId, photoBlob) {
  if (!photoBlob) return null
  try {
    const path = `${reportId}.jpg`
    const { error } = await supabase.storage.from('report-photos').upload(path, photoBlob, {
      contentType: 'image/jpeg',
      upsert: true,
    })
    if (error) throw error
    const { data } = supabase.storage.from('report-photos').getPublicUrl(path)
    return data?.publicUrl || null
  } catch (err) {
    console.error('Supabase photo upload failed:', err)
    return null
  }
}

export async function saveReport(report) {
  const photoUrl = await uploadReportPhoto(report.id, report.photoBlob)
  try {
    const { error } = await supabase.from('reports').insert({
      id: report.id,
      hotspot_id: report.hotspotId || null,
      lat: report.lat,
      lng: report.lng,
      location_label: report.locationLabel,
      area: report.area,
      photo_url: photoUrl,
      location_source: report.locationSource || 'gps',
      user_location_note: report.userLocationNote || null,
      photo_verified: !!report.photoVerified,
      analysis: report.analysis,
      priority_score: report.priorityScore ?? null,
      created_at: report.timestamp,
    })
    if (error) throw error
  } catch (err) {
    console.error('Supabase report insert failed:', err)
  }
  // small local cache as a fallback / for instant UI if needed later
  try {
    const raw = localStorage.getItem(REPORTS_LOCAL_KEY)
    const list = raw ? JSON.parse(raw) : []
    list.unshift({ ...report, photoBlob: undefined, photoUrl })
    localStorage.setItem(REPORTS_LOCAL_KEY, JSON.stringify(list.slice(0, 50)))
  } catch {}
}

// Fetches the citizen reports submitted for a given hotspot, most recent
// first, so their photos and verification status are visible to everyone
// viewing the site — not just baked into the aggregate hotspot stats.
export async function loadReportsForHotspot(hotspotId) {
  if (!hotspotId) return []
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('hotspot_id', hotspotId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return (data || []).map((row) => ({
      id: row.id,
      photoUrl: row.photo_url,
      locationLabel: row.location_label,
      locationSource: row.location_source,
      userLocationNote: row.user_location_note,
      photoVerified: row.photo_verified,
      analysis: row.analysis,
      createdAt: row.created_at,
      lat: row.lat,
      lng: row.lng,
    }))
  } catch (err) {
    console.error('Supabase report load failed:', err)
    return []
  }
}

export async function resetDemoData() {
  try {
    await supabase.from('hotspots').delete().neq('id', '')
    await supabase.from('hotspots').insert(seedHotspots.map(hotspotToRow))
  } catch (err) {
    console.error('Supabase reset failed:', err)
  }
  try { localStorage.removeItem(REPORTS_LOCAL_KEY) } catch {}
}
