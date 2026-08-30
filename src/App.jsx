import React, { useState, useMemo, useCallback, useEffect } from 'react'
import MapView from './components/MapView'
import HotspotDetail from './components/HotspotDetail'
import AreaPanel from './components/AreaPanel'
import Dashboard from './components/Dashboard'
import ReportFlow from './components/ReportFlow'
import Welcome from './components/Welcome'
import LoadingScreen from './components/LoadingScreen'
import GuidedTour from './components/GuidedTour'
import CityIntelligence from './components/CityIntelligence'
import { loadHotspots, upsertHotspot, saveReport, applyReportToHotspots, updateHotspotStatus } from './lib/store'
import { buildAreaIndex, summarizeArea } from './lib/areaEngine'
import { severityMeta } from './lib/priorityEngine'

const INTEL_SEEN_KEY = 'lwis_intel_opened_v1'

export default function App() {
  const [hotspots, setHotspots] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [tab, setTab] = useState('map')
  const [selectedHotspot, setSelectedHotspot] = useState(null)
  const [selectedArea, setSelectedArea] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [opsMode, setOpsMode] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [tourOpen, setTourOpen] = useState(false)
  const [intelOpen, setIntelOpen] = useState(false)
  const [intelSeen, setIntelSeen] = useState(true)
  const [showDensityLayer, setShowDensityLayer] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadHotspots().then((data) => {
      if (!cancelled) {
        setHotspots(data)
        setDataLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    try {
      setIntelSeen(!!localStorage.getItem(INTEL_SEEN_KEY))
    } catch {}
  }, [])

  function dismissWelcome() {
    setShowWelcome(false)
  }

  function openIntel() {
    setIntelOpen(true)
    setIntelSeen(true)
    try { localStorage.setItem(INTEL_SEEN_KEY, '1') } catch {}
  }

  const areaIndex = useMemo(() => buildAreaIndex(hotspots), [hotspots])
  const areaNames = useMemo(() => Object.keys(areaIndex).sort(), [areaIndex])
  const areaSummary = useMemo(() => {
    if (!selectedArea || !areaIndex[selectedArea]) return null
    return summarizeArea(selectedArea, areaIndex[selectedArea])
  }, [selectedArea, areaIndex])

  const visibleHotspots = useMemo(() => {
    if (!selectedArea) return hotspots
    return hotspots.filter((h) => h.area === selectedArea)
  }, [hotspots, selectedArea])

  const areaFlyCenter = useMemo(() => {
    if (!selectedArea || !areaIndex[selectedArea] || areaIndex[selectedArea].length === 0) return null
    const list = areaIndex[selectedArea]
    const lat = list.reduce((s, h) => s + h.lat, 0) / list.length
    const lng = list.reduce((s, h) => s + h.lng, 0) / list.length
    return { lat, lng }
  }, [selectedArea, areaIndex])

  const cityStats = useMemo(() => {
    const total = hotspots.length
    const highPriority = hotspots.filter((h) => h.severity === 'critical' || h.severity === 'high').length
    const avgRecyclable = Math.round(hotspots.reduce((s, h) => s + h.recyclablePct, 0) / (total || 1))
    const burning = hotspots.filter((h) => h.burning).length
    return { total, highPriority, avgRecyclable, burning }
  }, [hotspots])

  const hazardHotspots = useMemo(
    () => hotspots.filter((h) => h.burning && h.status !== 'resolved'),
    [hotspots]
  )

  const handleSubmitted = useCallback(
    (report, nearestHotspotId) => {
      const { hotspots: next, hotspotId } = applyReportToHotspots(hotspots, report, nearestHotspotId)
      setHotspots(next)
      setReportOpen(false)
      setTab('map')
      const updated = next.find((h) => h.id === hotspotId)
      if (updated) setSelectedHotspot(updated)

      if (updated) upsertHotspot(updated)
      saveReport({ ...report, hotspotId, priorityScore: null })
    },
    [hotspots]
  )

  const handleStatusChange = useCallback(
    (hotspotId, status) => {
      const next = updateHotspotStatus(hotspots, hotspotId, status)
      setHotspots(next)
      const updated = next.find((h) => h.id === hotspotId)
      if (updated) {
        setSelectedHotspot(updated)
        upsertHotspot(updated)
      }
    },
    [hotspots]
  )

  if (dataLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">LWI</div>
          <div className="brand-text">
            <div className="brand-title">Lahore Waste Intelligence System</div>
            <div className="brand-sub">{opsMode ? 'CITY OPERATIONS MODE' : 'CITIZEN VIEW · PILOT BUILD'}</div>
          </div>
        </div>

        <nav className="nav-tabs">
          <button className={`nav-tab ${tab === 'map' ? 'active' : ''}`} onClick={() => setTab('map')}>🗺️ Intelligence Map</button>
          <button className={`nav-tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>📊 City Dashboard</button>
        </nav>

        <div className="topbar-right">
          <button className="guide-relaunch-btn" onClick={() => setTourOpen(true)} title="Replay the guided tour">❔</button>
          <button
            className="btn-ghost"
            onClick={() => setOpsMode((v) => !v)}
            style={opsMode ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            title="Toggle between citizen view and city operations view"
          >
            <span>{opsMode ? '🏛️' : '👤'}</span>
            <span className="btn-label-full"> {opsMode ? 'Ops mode: ON' : 'Citizen view'}</span>
          </button>
          <span className="demo-badge"><span className="dot" /> Live shared database</span>
          <button id="report-btn" className="btn-primary" onClick={() => { setSelectedHotspot(null); setReportOpen(true) }}>📸 Report waste</button>
        </div>
      </header>

      {hazardHotspots.length > 0 && (
        <div
          className="hazard-banner"
          onClick={() => { setTab('map'); setSelectedHotspot(hazardHotspots[0]) }}
          style={{
            background: 'var(--sev-critical-soft)',
            borderBottom: '1px solid rgba(228,72,58,0.4)',
            color: 'var(--sev-critical)',
            padding: '8px 16px',
            fontSize: 12.5,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          🔥 {hazardHotspots.length} site{hazardHotspots.length > 1 ? 's' : ''} with active burning/hazard indicators — click to review
        </div>
      )}

      <div className="view-area">
        {tab === 'map' && (
          <div className="map-wrap" id="map-region">
            <MapView
              hotspots={visibleHotspots}
              onSelect={setSelectedHotspot}
              center={areaFlyCenter}
              zoom={areaFlyCenter ? 14 : 12}
              flyToOnCenterChange
              showDensityLayer={showDensityLayer}
              allHotspotsForDensity={hotspots}
            />

            <div className="map-top-stack">
              <div className="map-context-bar">
                <span className="map-context-title">🗺️ Lahore Waste Hotspot Map</span>
                <span className="map-context-sub">Pins are colored by severity — tap any pin for full site intelligence</span>
                <button
                  className={`density-toggle-btn ${showDensityLayer ? 'active' : ''}`}
                  onClick={() => setShowDensityLayer((v) => !v)}
                  title="Population & waste-generation density, from PBS Census 2023 and the Urban Unit 2025 SWM report — not citizen-reported hotspots"
                >
                  🌐 {showDensityLayer ? 'Hide' : 'Show'} area density
                </button>
                <button
                  id="intel-fab"
                  className={`intel-cta-btn ${!intelSeen ? 'pulse-attention' : ''}`}
                  onClick={openIntel}
                  style={{ marginLeft: 'auto' }}
                >
                  <span className="intel-sparkle">✦</span> <span className="intel-label">City Intelligence</span>
                </button>
              </div>

              <div className="stat-strip">
                <StatChip label="Total hotspots" value={cityStats.total} />
                <StatChip label="High priority" value={cityStats.highPriority} color="var(--sev-high)" />
                <StatChip label="Avg. recyclable" value={`${cityStats.avgRecyclable}%`} color="var(--teal)" />
                <StatChip label="Burning / hazard" value={cityStats.burning} color="var(--sev-critical)" />
              </div>

              <AreaPanel
                areaNames={areaNames}
                selectedArea={selectedArea}
                onSelectArea={setSelectedArea}
                summary={areaSummary}
                onSelectHotspot={setSelectedHotspot}
              />
            </div>

            <div className="legend-float">
              <div className="legend-heading">Severity legend</div>
              <div className="legend-items-row">
                {['critical', 'high', 'moderate', 'low'].map((s) => {
                  const m = severityMeta(s)
                  return (
                    <div className="legend-item" key={s}>
                      <span className="legend-dot" style={{ background: m.color }} />
                      {m.label}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'dashboard' && <Dashboard hotspots={hotspots} onSelectHotspot={setSelectedHotspot} />}

        {selectedHotspot && (
          <HotspotDetail
            hotspot={selectedHotspot}
            onClose={() => setSelectedHotspot(null)}
            opsMode={opsMode}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {reportOpen && (
        <ReportFlow
          hotspots={hotspots}
          initialHotspot={null}
          onClose={() => setReportOpen(false)}
          onSubmitted={handleSubmitted}
        />
      )}

      {intelOpen && (
        <CityIntelligence
          hotspots={hotspots}
          selectedHotspot={selectedHotspot}
          onClose={() => setIntelOpen(false)}
          onSelectHotspot={(h) => { setIntelOpen(false); setTab('map'); setSelectedHotspot(h) }}
        />
      )}

      {tourOpen && <GuidedTour onFinish={() => setTourOpen(false)} />}

      {showWelcome && (
        <Welcome
          onExplore={dismissWelcome}
          onReport={() => { dismissWelcome(); setSelectedHotspot(null); setReportOpen(true) }}
          onGuide={() => { dismissWelcome(); setTourOpen(true) }}
        />
      )}
    </div>
  )
}

function StatChip({ label, value, color }) {
  return (
    <div className="stat-chip">
      <div className="stat-value" style={color ? { color } : undefined}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
