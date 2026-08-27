import React, { useEffect, useState, useCallback } from 'react'

// Copy is deliberately short, specific, and casual — pointing at what's
// literally on screen rather than describing the system in the abstract.
const STEPS = [
  {
    target: null,
    title: "Quick context first",
    body: "People report the same dumping spots over and over, and nobody's tracking whether anything actually gets cleaned. This is what that tracking looks like — for real, shared across everyone who opens this page.",
    emoji: '👋',
  },
  {
    target: '#map-region',
    title: "Those pins? Real hotspots.",
    body: "Red means it's bad, green means it's under control. Tap any pin and you'll get the full story — what kind of waste, how often it's reported, whether it's being burned, all of it.",
    emoji: '🗺️',
  },
  {
    target: '.area-panel-float',
    title: "Pick a neighborhood",
    body: "Shahdara, Gulberg, Kot Lakhpat — whatever area you care about, pick it here. You'll see why it's a priority in plain language, not just a number.",
    emoji: '📍',
  },
  {
    target: '#intel-fab',
    title: "This button does the thinking",
    body: "Click it and ask things like \"what should we clean first\" or \"where's the risk today.\" Every answer comes straight from the live data — nothing's made up on the spot.",
    emoji: '✦',
  },
  {
    target: '#report-btn',
    title: "You can add to this",
    body: "Snap a photo of a dump site, drop a pin, and AI reads the waste type and risk right there. The map updates for everyone the second you submit — not just your screen.",
    emoji: '📸',
  },
  {
    target: null,
    title: "That's it",
    body: "Map → pick an area → check a hotspot → report if you see something. Lost later? Hit the ❔ up top and I'll walk you through it again.",
    emoji: '✅',
  },
]

export default function GuidedTour({ onFinish }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)

  const current = STEPS[step]

  const measure = useCallback(() => {
    if (!current.target) {
      setRect(null)
      return
    }
    const el = document.querySelector(current.target)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [current.target])

  useEffect(() => {
    // Small delay so layout has settled (e.g. right after the welcome modal closes).
    const t = setTimeout(measure, 60)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1)
    else onFinish()
  }
  function back() {
    if (step > 0) setStep(step - 1)
  }

  const cardStyle = getCardPosition(rect)

  return (
    <>
      <div className="tour-dim" />
      {rect && (
        <div
          className="tour-ring"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      )}

      <div className="tour-card" style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>{current.emoji}</span>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{current.title}</div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 16 }}>
          {current.body}
        </div>

        <div className="step-dots" style={{ padding: 0, marginBottom: 14 }}>
          {STEPS.map((_, i) => (
            <div key={i} className={`step-dot ${i <= step ? 'done' : ''}`} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 12px' }} onClick={onFinish}>
            Skip
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 12px' }} onClick={back}>← Back</button>
            )}
            <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={next}>
              {step === STEPS.length - 1 ? 'Got it' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function getCardPosition(rect) {
  const cardWidth = 340
  const margin = 16
  if (!rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: cardWidth,
    }
  }

  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  let top = rect.bottom + margin
  if (top + 220 > viewportH) top = Math.max(margin, rect.top - 220 - margin)

  let left = rect.left
  if (left + cardWidth > viewportW - margin) left = viewportW - cardWidth - margin
  if (left < margin) left = margin

  return { top, left, width: cardWidth }
}
