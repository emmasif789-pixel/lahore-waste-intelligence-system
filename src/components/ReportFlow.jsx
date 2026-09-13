import React, { useState, useRef, useEffect } from 'react'
import Gauge from './Gauge'
import MapView from './MapView'
import { getUserLocation, reverseGeocodeLabel, nearestHotspot, nearestArea } from '../lib/geo'
import { analyzeWastePhoto } from '../lib/analyzeWaste'
import { scoreHotspot, recommendedAction } from '../lib/priorityEngine'
import { IconAlertTriangle, IconMapPin, IconCamera, IconCheckCircle, IconClipboardList } from './Icons'

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
  const [locationDenied, setLocationDenied] = useState(false)
  const [locationSource, setLocationSource] = useState(initialHotspot ? 'manual' : null)
  const [locationLabel, setLocationLabel] = useState(initialHotspot ? initialHotspot.name : '')
  const [userLocationNote, setUserLocationNote] = useState('')
  const [file, setFile] = useState(null)
  const [imgUrl, setImgUrl] = useState(null)
  const [photoVerified, setPhotoVerified] = useState(false)
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
    setLocationDenied(false)
    const loc = await getUserLocation()
    if (loc.approximate) {
      // Geolocation failed or was denied. Don't silently substitute the
      // city center and present it as if it were the real location —
      // that's exactly the kind of wrong-location misinfo this flow is
      // meant to prevent. Leave point unset; the person can retry or
      // place a pin manually on the map (clearly labeled "manual" below).
      setLocating(false)
      setLocationDenied(true)
      return
    }
    setPoint({ lat: loc.lat, lng: loc.lng })
    setLocationSource('gps')
    const label = await reverseGeocodeLabel(loc.lat, loc.lng)
    setLocationLabel(label || 'Detected location')
    setLocating(false)
  }

  async function handlePick(p) {
    setPoint(p)
    setLocationSource('manual')
    setLocationDenied(false)
    setLocating(true)
    const label = await reverseGeocodeLabel(p.lat, p.lng)
    setLocationLabel(label || 'Selected location')
    setLocating(false)
  }

  function handleCaptured(blob, verified) {
    setFile(blob)
    setPhotoVerified(verified)
    const url = URL.createObjectURL(blob)
    setImgUrl(url)
  }

  function handleFile(f) {
    if (!f) return
    handleCaptured(f, false) // gallery/file-picker photos are never marked verified
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

  function handleRetake() {
    setFile(null)
    setImgUrl(null)
    setPhotoVerified(false)
  }

  function handleSubmit() {
    const report = {
      id: `RPT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      lat: point.lat,
      lng: point.lng,
      locationLabel,
      locationSource: locationSource || 'manual',
      userLocationNote: userLocationNote.trim() || null,
      area: nearby ? nearby.area : nearestArea(point, hotspots),
      analysis,
      nearby: pseudoHotspot?.nearby,
      photoBlob: file,
      photoVerified,
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
              locationDenied={locationDenied}
              locationSource={locationSource}
              locationLabel={locationLabel}
              userLocationNote={userLocationNote}
              onNoteChange={setUserLocationNote}
              hotspots={hotspots}
              onPick={handlePick}
              onRedetect={detectLocation}
            />
          )}

          {step === 1 && (
            <PhotoStep
              imgUrl={imgUrl}
              photoVerified={photoVerified}
              fileInputRef={fileInputRef}
              imgElRef={imgElRef}
              point={point}
              onCaptured={handleCaptured}
              onRetake={handleRetake}
              onFile={handleFile}
            />
          )}

          {step === 2 && (
            <AnalysisStep analyzing={analyzing} analysis={analysis} scoreResult={scoreResult} action={action} imgUrl={imgUrl} />
          )}

          {step === 3 && (
            <SubmitStep locationLabel={locationLabel} locationSource={locationSource} photoVerified={photoVerified} analysis={analysis} scoreResult={scoreResult} action={action} />
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

function LocationStep({ point, locating, locationDenied, locationSource, locationLabel, userLocationNote, onNoteChange, hotspots, onPick, onRedetect }) {
  return (
    <div>
      <label className="field-label">Detected / selected location</label>

      {locationDenied && !point && (
        <div className="location-denied-note">
          <IconAlertTriangle size={14} />
          <div>
            <div style={{ fontWeight: 600 }}>Location access is needed to verify this report</div>
            <div style={{ fontSize: 11.5, marginTop: 2 }}>Allow location access and try again, or tap the exact spot on the map below to place a pin manually.</div>
          </div>
        </div>
      )}

      {point && (
        <div className="location-card" style={{ marginBottom: 10 }}>
          <IconMapPin size={17} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{locating ? 'Detecting…' : locationLabel || 'Tap the map to place a pin'}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</div>
          </div>
          <span className={`location-source-tag ${locationSource === 'gps' ? 'gps' : 'manual'}`}>
            {locationSource === 'gps' ? 'GPS' : 'Manual'}
          </span>
        </div>
      )}

      <button className="btn-ghost" style={{ width: '100%', padding: '8px 10px', fontSize: 12, marginBottom: 12 }} onClick={onRedetect} disabled={locating}>
        {locating ? 'Detecting…' : '📡 Use my current location'}
      </button>

      <div style={{ height: 240, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
        <MapView hotspots={hotspots} center={point} zoom={14} pickMode onPick={onPick} pickedPoint={point} scrollWheelZoom={false} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>Tap anywhere on the map to place or adjust the pin manually.</div>

      <label className="field-label" style={{ marginTop: 14 }}>Add a location note (optional)</label>
      <input
        type="text"
        className="text-input"
        placeholder="e.g. Behind Al-Falah Market, near the mosque"
        value={userLocationNote}
        onChange={(e) => onNoteChange(e.target.value)}
        maxLength={140}
      />
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Helps others recognize the spot — this doesn't replace the GPS/pin coordinates above.</div>
    </div>
  )
}

function PhotoStep({ imgUrl, photoVerified, fileInputRef, imgElRef, point, onCaptured, onRetake, onFile }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => () => stopCamera(), []) // eslint-disable-line react-hooks/exhaustive-deps

  async function startCamera() {
    setStarting(true)
    setCameraError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported on this browser')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      setCameraActive(true)
      setStarting(false)
      // Attach after the <video> element has actually mounted.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
    } catch (err) {
      setCameraError(err?.message || 'Camera access was denied or is unavailable')
      setCameraActive(false)
      setStarting(false)
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Burn a verification watermark into the pixels — timestamp + the
    // location captured in step 1 — so the evidence travels with the image
    // itself instead of relying on metadata that's easy to strip.
    const barHeight = Math.max(30, Math.round(canvas.height * 0.05))
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight)
    ctx.fillStyle = '#ffffff'
    ctx.font = `${Math.round(barHeight * 0.4)}px sans-serif`
    ctx.textBaseline = 'middle'
    const stamp = new Date().toLocaleString('en-GB', { hour12: false })
    const coords = point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : 'location pending'
    ctx.fillText(`LWIS verified capture · ${stamp} · ${coords}`, 10, canvas.height - barHeight / 2)

    canvas.toBlob((blob) => {
      stopCamera()
      if (blob) onCaptured(blob, true)
    }, 'image/jpeg', 0.92)
  }

  if (imgUrl) {
    return (
      <div>
        <label className="field-label">Waste photo</label>
        <img ref={imgElRef} src={imgUrl} alt="Waste report" className="preview-photo" crossOrigin="anonymous" />
        <div className={`photo-verified-tag ${photoVerified ? 'verified' : 'unverified'}`}>
          {photoVerified ? <><IconCheckCircle size={12} /> Live camera capture, verified</> : <><IconAlertTriangle size={12} /> Uploaded from gallery — unverified</>}
        </div>
        <button className="btn-ghost" style={{ marginTop: 10, fontSize: 12 }} onClick={onRetake}>Retake photo</button>
        <PhotoGuidelines />
      </div>
    )
  }

  return (
    <div>
      <label className="field-label">Waste photo</label>

      {cameraActive ? (
        <div className="camera-live-wrap">
          <video ref={videoRef} playsInline muted className="camera-live-video" />
          <div className="camera-live-actions">
            <button className="btn-ghost" onClick={stopCamera}>Cancel</button>
            <button className="camera-shutter-btn" onClick={capture} aria-label="Capture photo" />
          </div>
        </div>
      ) : (
        <div className="dropzone" onClick={startCamera}>
          <IconCamera size={28} />
          <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 8 }}>{starting ? 'Opening camera…' : 'Tap to open camera'}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Live capture only — this keeps reports honest</div>
        </div>
      )}

      {cameraError && !cameraActive && (
        <div className="location-denied-note" style={{ marginTop: 10 }}>
          <IconAlertTriangle size={14} />
          <div>
            <div style={{ fontWeight: 600 }}>Camera unavailable</div>
            <div style={{ fontSize: 11.5, marginTop: 2 }}>{cameraError}. You can upload a photo instead, but it will be marked unverified.</div>
          </div>
        </div>
      )}

      {!cameraActive && (
        <button className="btn-ghost" style={{ width: '100%', marginTop: 10, fontSize: 12 }} onClick={() => fileInputRef.current?.click()}>
          Or choose from gallery instead (unverified)
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <PhotoGuidelines />
    </div>
  )
}

function PhotoGuidelines() {
  return (
    <div className="photo-guidelines">
      <div className="photo-guidelines-title"><IconClipboardList size={13} /> Photo guidelines</div>
      <ul>
        <li>Take the photo now, at the actual site — don't reuse an old or unrelated photo.</li>
        <li>Show the waste clearly, in daylight if possible.</li>
        <li>Don't include people's faces or private property details.</li>
        <li>Wrong or misleading photos reduce trust in this map for everyone using it.</li>
      </ul>
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

function SubmitStep({ locationLabel, locationSource, photoVerified, analysis, scoreResult }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <div className="success-check">✓</div>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Ready to submit</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, maxWidth: 380, margin: '0 auto' }}>
        This report at <strong>{locationLabel}</strong> will be added to the city intelligence layer with a priority score of{' '}
        <strong style={{ color: 'var(--accent)' }}>{scoreResult?.score.toFixed(1)}/10</strong>. The dashboard, area intelligence, and map will update immediately.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
        <span className={`location-source-tag ${locationSource === 'gps' ? 'gps' : 'manual'}`}>
          {locationSource === 'gps' ? 'GPS location' : 'Manually placed'}
        </span>
        <span className={`photo-verified-tag inline ${photoVerified ? 'verified' : 'unverified'}`}>
          {photoVerified ? 'Verified photo' : 'Unverified photo'}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>This will be visible to everyone viewing the map, so please make sure it's accurate.</div>
    </div>
  )
}
