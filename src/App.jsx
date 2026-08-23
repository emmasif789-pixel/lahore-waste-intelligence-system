import React, { useState, useMemo, useCallback, useEffect } from 'react'
import MapView from './components/MapView'
import HotspotDetail from './components/HotspotDetail'
import AreaPanel from './components/AreaPanel'
import Dashboard from './components/Dashboard'
import ReportFlow from './components/ReportFlow'
import Welcome from './components/Welcome'
import { loadHotspots, saveHotspots, saveReport, applyReportToHotspots, updateHotspotStatus } from './lib/store'
import { buildAreaIndex, summarizeArea } from './lib/areaEngine'
import { severityMeta } from './lib/priorityEngine'

const SEEN_KEY = 'lwis_seen_welcome_v1'

export default function App() {
  const [hotspots, setHotspots] = useState(() => loadHotspots())
  const [tab, setTab] = useState('map')
  const [selectedHotspot, setSelectedHotspot] = useState(null)
  const [selectedArea, setSelectedArea] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [opsMode, setOpsMode] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setShowWelcome(true)
    } catch {
      setShowWelcome(true)
    }
  }, [])

  function dismissWelcome() {
    setShowWelcome(false)
    try { localStorage.setItem(SEEN_KEY, '1') } catch {}
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

  const cityStats = useMemo(() => {
    const total = hotspots.length
    const highPriority = hotspots.filter((h) => h.severity === 'critical' || h.severity === 'high').length
    const avgRecyclable = Math.round(hotspots.reduce((s, h) => s + h.recyclablePct, 0) / (total || 1))
    const burning = hotspots.filter((h) => h.burning).length
    return { total, highPriority, avgRecyclable, burning }
  }, [hotspots])

  const handleSubmitted = useCallback(
    (report, nearestHotspotId) => {
      saveReport(report)
      const { hotspots: next, hotspotId } = applyReportToHotspots(hotspots, report, nearestHotspotId)
      setHotspots(next)
      saveHotspots(next)
      setReportOpen(false)
      setTab('map')
      const updated = next.find((h) => h.id === hotspotId)
      if (updated) setSelectedHotspot(updated)
    },
    [hotspots]
  )

  const handleStatusChange = useCallback(
    (hotspotId, status) => {
      const next = updateHotspotStatus(hotspots, hotspotId, status)
      setHotspots(next)
      saveHotspots(next)
      const updated = next.find((h) => h.id === hotspotId)
      if (updated) setSelectedHotspot(updated)
    },
    [hotspots]
  )

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
          <button
            className="btn-ghost"
            onClick={() => setOpsMode((v) => !v)}
            style={opsMode ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            title="Toggle between citizen view and city operations view"
          >
            {opsMode ? '🏛️ Ops mode: ON' : '👤 Citizen view'}
          </button>
          <span className="demo-badge"><span className="dot" /> Community / demo data</span>
          <button className="btn-primary" onClick={() => { setSelectedHotspot(null); setReportOpen(true) }}>📸 Report waste</button>
        </div>
      </header>

      <div className="view-area">
        {tab === 'map' && (
          <div className="map-wrap">
            <MapView hotspots={visibleHotspots} onSelect={setSelectedHotspot} />

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

            <div className="legend-float">
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

      {showWelcome && (
        <Welcome
          onDismiss={dismissWelcome}
          onStartReport={() => { dismissWelcome(); setSelectedHotspot(null); setReportOpen(true) }}
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
