import React, { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { severityMeta } from '../lib/priorityEngine'
import { LAHORE_CENTER } from '../lib/geo'

function makeIcon(severity, pulse) {
  const meta = severityMeta(severity)
  const html = `
    <div style="position:relative;width:26px;height:26px;">
      ${pulse ? `<div class="pulse-ring" style="width:26px;height:26px;background:${meta.color};left:0;top:0;"></div>` : ''}
      <div class="hotspot-pin" style="width:26px;height:26px;background:${meta.color};position:relative;">
        <div class="hotspot-pin-inner">${meta.emoji.replace(/./, '')}</div>
      </div>
    </div>`
  return L.divIcon({ html, className: '', iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] })
}

const pickIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3fb6a8;border:3px solid #0a0e13;box-shadow:0 0 0 3px rgba(63,182,168,.4)"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function ClickCatcher({ onPick }) {
  useMapEvents({
    click(e) {
      onPick && onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export default function MapView({
  hotspots = [],
  onSelect,
  center,
  zoom = 12,
  pickMode = false,
  onPick,
  pickedPoint,
  height = '100%',
  scrollWheelZoom = true,
}) {
  const icons = useMemo(() => {
    const map = {}
    for (const sev of ['critical', 'high', 'moderate', 'low']) {
      map[sev] = { normal: makeIcon(sev, false), pulse: makeIcon(sev, true) }
    }
    return map
  }, [])

  return (
    <MapContainer
      center={center || LAHORE_CENTER}
      zoom={zoom}
      style={{ height, width: '100%' }}
      scrollWheelZoom={scrollWheelZoom}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hotspots.map((h) => (
        <Marker
          key={h.id}
          position={[h.lat, h.lng]}
          icon={h.severity === 'critical' ? icons[h.severity].pulse : icons[h.severity].normal}
          eventHandlers={{ click: () => onSelect && onSelect(h) }}
        >
          <Popup>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>{h.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>{h.area} · {severityMeta(h.severity).label}</div>
          </Popup>
        </Marker>
      ))}
      {pickMode && <ClickCatcher onPick={onPick} />}
      {pickedPoint && <Marker position={[pickedPoint.lat, pickedPoint.lng]} icon={pickIcon} />}
    </MapContainer>
  )
}
