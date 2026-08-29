import React, { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl, useMap, GeoJSON, CircleMarker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { severityMeta } from '../lib/priorityEngine'
import { LAHORE_CENTER } from '../lib/geo'
import lahoreDensity from '../data/lahoreDensity.json'

// Proportional-symbol scaling: radius by population, real PBS 2023 figures.
// Min/max picked from the actual tehsil population range so circles stay
// legible at city zoom without exaggerating the smallest tehsil (Raiwind).
const POP_MIN = Math.min(...lahoreDensity.tehsilPoints.map((t) => t.population_2023))
const POP_MAX = Math.max(...lahoreDensity.tehsilPoints.map((t) => t.population_2023))
function popRadius(pop) {
  const t = (pop - POP_MIN) / (POP_MAX - POP_MIN)
  return 18 + t * 34 // px radius range, tuned for city-wide zoom levels
}

function makeIcon(severity, pulse) {
  const meta = severityMeta(severity)
  const html = `
    <div style="position:relative;width:22px;height:22px;">
      ${pulse ? `<div class="pulse-ring" style="width:22px;height:22px;background:${meta.color};left:0;top:0;"></div>` : ''}
      <div style="
        width:22px;height:22px;border-radius:50%;
        background:${meta.color};
        border:3px solid #0a0e13;
        box-shadow:0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px ${meta.color}55;
        position:relative;
      "></div>
    </div>`
  return L.divIcon({ html, className: '', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -14] })
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

function FlyToCenter({ center, zoom }) {
  const map = useMap()
  React.useEffect(() => {
    const target = center || LAHORE_CENTER
    map.flyTo([target.lat, target.lng], zoom || map.getZoom(), { duration: 0.9 })
  }, [center?.lat, center?.lng])
  return null
}

function PanControls() {
  const map = useMap()
  const pan = (dx, dy) => map.panBy([dx, dy], { animate: true, duration: 0.35 })
  return (
    <div className="map-pan-pad">
      <button className="pan-btn pan-up" onClick={() => pan(0, -110)} aria-label="Pan up">▲</button>
      <div className="pan-mid-row">
        <button className="pan-btn pan-left" onClick={() => pan(-110, 0)} aria-label="Pan left">◀</button>
        <button className="pan-btn pan-right" onClick={() => pan(110, 0)} aria-label="Pan right">▶</button>
      </div>
      <button className="pan-btn pan-down" onClick={() => pan(0, 110)} aria-label="Pan down">▼</button>
    </div>
  )
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
  flyToOnCenterChange = false,
  showDensityLayer = false,
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
      zoomControl={false}
    >
      <ZoomControl position="bottomleft" />
      <PanControls />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showDensityLayer && (
        <GeoJSON
          data={lahoreDensity.districtBoundary}
          style={{ color: '#3fb6a8', weight: 2, opacity: 0.55, fillOpacity: 0.03, dashArray: '4 4' }}
        />
      )}
      {showDensityLayer &&
        lahoreDensity.tehsilPoints.map((t) => (
          <CircleMarker
            key={t.name}
            center={[t.lat, t.lng]}
            radius={popRadius(t.population_2023)}
            pathOptions={{
              color: '#f2a93b',
              weight: 1.5,
              fillColor: '#f2a93b',
              fillOpacity: 0.14,
            }}
          >
            <Tooltip direction="top" opacity={1}>
              <div style={{ fontWeight: 600 }}>{t.name}</div>
              <div>{t.population_2023.toLocaleString()} people (PBS 2023)</div>
              <div>~{t.estimated_waste_tpd.toLocaleString()} tonnes/day est. waste</div>
            </Tooltip>
          </CircleMarker>
        ))}
      {hotspots.map((h) => (
        <Marker
          key={h.id}
          position={[h.lat, h.lng]}
          icon={h.severity === 'critical' || h.severity === 'high' ? icons[h.severity].pulse : icons[h.severity].normal}
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
      {flyToOnCenterChange && <FlyToCenter center={center} zoom={zoom} />}
    </MapContainer>
  )
}
