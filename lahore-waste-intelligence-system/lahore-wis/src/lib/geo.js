export function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function nearestHotspot(point, hotspots, maxKm = 0.6) {
  let best = null
  let bestDist = Infinity
  for (const h of hotspots) {
    const d = haversineKm(point, h)
    if (d < bestDist) {
      bestDist = d
      best = h
    }
  }
  if (best && bestDist <= maxKm) return { hotspot: best, distanceKm: bestDist }
  return { hotspot: null, distanceKm: bestDist }
}

export function nearestArea(point, hotspots) {
  const { hotspot } = nearestHotspot(point, hotspots, Infinity)
  return hotspot?.area || 'Unassigned'
}

const LAHORE_CENTER = { lat: 31.5497, lng: 74.3436 }

export async function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ...LAHORE_CENTER, approximate: true })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, approximate: false }),
      () => resolve({ ...LAHORE_CENTER, approximate: true }),
      { timeout: 6000 }
    )
  })
}

export async function reverseGeocodeLabel(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error('reverse geocode failed')
    const data = await res.json()
    const a = data.address || {}
    return (
      a.suburb || a.neighbourhood || a.residential || a.road || data.display_name?.split(',')[0] || 'Unnamed location'
    )
  } catch {
    return null
  }
}

export { LAHORE_CENTER }
