import React, { useState, useRef, useEffect } from 'react'
import Gauge from './Gauge'
import MapView from './MapView'
import { getUserLocation, reverseGeocodeLabel, nearestHotspot, nearestArea } from '../lib/geo'
import { analyzeWastePhoto } from '../lib/analyzeWaste'
import { scoreHotspot, recommendedAction } from '../lib/priorityEngine'

const STEPS = ['Location', 'Photo', 'Analysis', 'Submit']

const TYPE_COLOR = {
  Organic: '#4fae64', Plastic: '#3fb6a8', Cardboard: '#cf9a3e', Metal: '#93a1af',
  Glass: '#6fb7e0', 'E-waste': '#b06fe0', Construction: '#a98358', Hazardous: '#e4483a',
  'Mixed/Residual': '#e0b93c',
}

export default function ReportFlow({ hotspots, initialHotspot, onClose, onSubmitted }) {
  const [step, setStep] = useState(0)
  const [point, setPoint] = useState(initialHotspot ? { lat: initialHotspot.lat, lng: initialHotspot.lng } : null)
  const [locating, setLocating] = useState(false)
  const [locationLabel, setLocationLabel] = useState(initialHotspot ? initialHotspot.name : '')
  const [file, setFile] = useState(null)
  const [imgUrl, setImgUrl] = useState(null)
  const imgElRef = useRef(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!point) detectLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function detectLocation() {
    setLocating(true)
    const loc = await getUserLocation()
    setPoint({ lat: loc.lat, lng: loc.lng })
    const label = await reverseGeocodeLabel(loc.lat, loc.lng)
    setLocationLabel(label || 'Detected location')
    setLocating(false)
  }

  async function handlePick(p) {
    setPoint(p)
    setLocating(true)
    const label = await reverseGeocodeLabel(p.lat, p.lng)
    setLocationLabel(label || 'Selected location')
    setLocating(false)
  }

  function handleFile(f) {
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setImgUrl(url)
  }

  async function runAnalysis() {
    setStep(2)
    setAnalyzing(true)
    const img = imgElRef.current
    const result = await analyzeWastePhoto(file, img, point)
    setAnalysis(result)
    setAnalyzing(false)
  }

  const { hotspot: nearby, distanceKm } = point ? nearestHotspot(point, hotspots) : { hotspot: null }
  const pseudoHotspot = analysis && {
    severity: analysis.severity,
    recurrence: nearby ? nearby.recurrence : 15,
    wasteTypes: analysis.categories || [],
    burning: (analysis.hazardIndicators || []).some((x) => /burn/i.test(x)),
    nearby: nearby ? nearby.nearby : ['Reported location'],
    recyclablePct: analysis.recoverablePct ?? 20,
    trend: nearby ? nearby.trend : [1],
  }
  const scoreResult = pseudoHotspot ? scoreHotspot(pseudoHotspot) : null
  const action = pseudoHotspot && scoreResult ? recommendedAction(pseudoHotspot, scoreResult.score) : null

  function handleSubmit() {
    const report = {
      id: `RPT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      lat: point.lat,
      lng: point.lng,
      locationLabel,
      area: nearby ? nearby.area : nearestArea(point, hotspots),
      analysis,
      nearby: pseudoHotspot?.nearby,
    }
    onSubmitted(report, nearby && distanceKm <= 0.35 ? nearby.id : null)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>📸 New waste report</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{STEPS[step]}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="step-dots">
          {STEPS.map((s, i) => (
            <div key={s} className={`step-dot ${i <= step ? 'done' : ''}`} />
          ))}
        </div>

        <div className="report-modal-body">
          {step === 0 && (
            <LocationStep
              point={point}
              locating={locating}
              locationLabel={locationLabel}
              hotspots={hotspots}
              onPick={handlePick}
              onRedetect={detectLocation}
            />
          )}

          {step === 1 && (
            <PhotoStep
              imgUrl={imgUrl}
              fileInputRef={fileInputRef}
              imgElRef={imgElRef}
              onFile={handleFile}
            />
          )}

          {step === 2 && (
            <AnalysisStep analyzing={analyzing} analysis={analysis} scoreResult={scoreResult} action={action} imgUrl={imgUrl} />
          )}

          {step === 3 && (
            <SubmitStep locationLabel={locationLabel} analysis={analysis} scoreResult={scoreResult} action={action} />
          )}
        </div>

        <div className="report-modal-footer">
          <button className="btn-ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          {step === 0 && (
            <button className="btn-primary" disabled={!point} onClick={() => setStep(1)}>Next: Add photo →</button>
          )}
          {step === 1 && (
            <button className="btn-primary" disabled={!file} onClick={runAnalysis}>Run AI analysis →</button>
          )}
          {step === 2 && (
            <button className="btn-primary" disabled={analyzing || !analysis} onClick={() => setStep(3)}>Continue →</button>
          )}
          {step === 3 && (
            <button className="btn-primary" onClick={handleSubmit}>✓ Submit report</button>
          )}
        </div>
      </div>
    </div>
  )
}

function LocationStep({ point, locating, locationLabel, hotspots, onPick, onRedetect }) {
  return (
    <div>
      <label className="field-label">Detected / selected location</label>
      <div className="location-card" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>📍</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{locating ? 'Detecting…' : locationLabel || 'Tap the map to place a pin'}</div>
          {point && <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</div>}
        </div>
        <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 11.5 }} onClick={onRedetect}>Use my location</button>
      </div>
      <div style={{ height: 260, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
        <MapView hotspots={hotspots} center={point} zoom={14} pickMode onPick={onPick} pickedPoint={point} scrollWheelZoom={false} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>Tap anywhere on the map to adjust the pin.</div>
    </div>
  )
}

function PhotoStep({ imgUrl, fileInputRef, imgElRef, onFile }) {
  return (
    <div>
      <label className="field-label">Waste photo</label>
      {!imgUrl ? (
        <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>📷</div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>Tap to take or upload a photo</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>JPG or PNG, one photo per report</div>
        </div>
      ) : (
        <div>
          <img ref={imgElRef} src={imgUrl} alt="Uploaded waste" className="preview-photo" crossOrigin="anonymous" />
          <button className="btn-ghost" style={{ marginTop: 10, fontSize: 12 }} onClick={() => fileInputRef.current?.click()}>Choose a different photo</button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  )
}

function AnalysisStep({ analyzing, analysis, scoreResult, action, imgUrl }) {
  if (analyzing) {
    return (
      <div className="analyzing-wrap">
        <div className="ai-pulse-dots">
          <span></span><span></span><span></span>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Running AI waste analysis…</div>
          <div className="analyzing-step">Detecting categories · estimating recoverable share · checking hazard indicators</div>
        </div>
      </div>
    )
  }
  if (!analysis) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="field-label" style={{ marginBottom: 0 }}>AI waste analysis</div>
        <span className={`badge-source ${analysis.source === 'model' ? 'model' : 'heuristic'}`}>
          {analysis.source === 'model' ? '🧠 Vision model' : '⚙️ Demo AI model'}
        </span>
      </div>
      <div className="confidence-note">
        {analysis.source === 'model'
          ? `Live vision-model estimate · confidence ${Math.round((analysis.confidence || 0) * 100)}%. Figures are AI estimates from a single photo, not a lab measurement.`
          : `No live vision API key configured for this deployment, so this result comes from an in-browser color/composition heuristic run on your actual photo · confidence ${Math.round((analysis.confidence || 0) * 100)}%. Connect GROQ_API_KEY to enable the live model.`}
      </div>

      <div className="section-label">Waste composition (AI estimate)</div>
      {(analysis.categories || []).map((c) => (
        <div className="bar-row" key={c.type}>
          <div className="bar-label">{c.type}</div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${c.pct}%`, background: TYPE_COLOR[c.type] || 'var(--accent)' }} /></div>
          <div className="bar-pct">{c.pct}%</div>
        </div>
      ))}

      <div className="section-label">Waste → Recovery</div>
      <div className="data-row"><span className="k">Recoverable materials</span><span className="v">{(analysis.recyclableMaterials || []).join(', ') || '—'}</span></div>
      <div className="data-row"><span className="k">Estimated recoverable share</span><span className="v">{analysis.recoverablePct ?? 0}%</span></div>

      {(analysis.hazardIndicators || []).length > 0 && (
        <>
          <div className="section-label">Hazard indicators</div>
          <div className="chip-list">{analysis.hazardIndicators.map((h) => <span className="chip" key={h}>{h}</span>)}</div>
        </>
      )}

      <div className="section-label">Environmental risk</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{analysis.environmentalRisk}</div>

      {scoreResult && (
        <>
          <div className="section-label">Estimated cleanup priority</div>
          <div className="gauge-wrap">
            <Gauge score={scoreResult.score} size={72} />
            {action && (
              <div className={`action-card ${action.label.toLowerCase().includes('hazard') ? 'hazard' : ''}`} style={{ flex: 1, marginTop: 0 }}>
                <div className="action-label" style={{ fontSize: 12.5 }}>→ {action.label}</div>
                <div className="action-detail" style={{ fontSize: 11.5 }}>{action.detail}</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SubmitStep({ locationLabel, analysis, scoreResult }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <div className="success-check">✓</div>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Ready to submit</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, maxWidth: 380, margin: '0 auto' }}>
        This report at <strong>{locationLabel}</strong> will be added to the city intelligence layer with a priority score of{' '}
        <strong style={{ color: 'var(--accent)' }}>{scoreResult?.score.toFixed(1)}/10</strong>. The dashboard, area intelligence, and map will update immediately.
      </div>
    </div>
  )
}
