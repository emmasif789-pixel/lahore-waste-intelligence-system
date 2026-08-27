import React, { useEffect, useState, useCallback } from 'react'

const STEPS = [
  {
    target: null,
    title: 'Why this exists',
    body: "Lahore generates waste faster than it can be tracked. Citizens see the same dumping sites pile up again and again, but there's no shared record of where, how bad, or what's being done about it. This system turns scattered garbage complaints into a structured, prioritized city intelligence layer — so cleanup crews know exactly where to go first, and why.",
    emoji: '🎯',
  },
  {
    target: '#map-region',
    title: 'The city intelligence map',
    body: 'Every colored pin is a tracked waste hotspot — red is critical, green is low priority. Tap any pin to see its full breakdown: waste composition, recyclable share, hazard risk, and a recommended action. This is real, shared data every visitor sees the same version of.',
    emoji: '🗺️',
  },
  {
    target: '.area-panel-float',
    title: 'Area intelligence',
    body: "Pick a neighborhood here — Shahdara, Gulberg, Kot Lakhpat, and more — to see why that specific area ranks as a priority zone, with a plain-language explanation grounded in real recurrence and hazard data.",
    emoji: '📍',
  },
  {
    target: '#intel-fab',
    title: 'City Intelligence',
    body: "This is the operational brain of the system. It surfaces today's top priorities, explains why a hotspot is critical, recommends where to dispatch crews, flags emerging hotspots, and answers direct questions — all computed live from the actual tracked data, not guesswork.",
    emoji: '✦',
  },
  {
    target: '#report-btn',
    title: 'Reporting waste',
    body: "Anyone can submit a photo report here. AI analyzes the waste composition and hazard risk, the system scores its cleanup priority, and the city intelligence layer updates immediately — for everyone, not just you. This is how the map stays alive.",
    emoji: '📸',
  },
  {
    target: null,
    title: "You're ready",
    body: "That's the whole loop: map → area → hotspot → photo report → AI analysis → priority score → city intelligence updates. You can reopen this guide anytime from the ❔ button in the top bar.",
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
    if (el) {
      setRect(el.getBoundingClientRect())
      el.classList.add('tour-highlight-target')
    } else {
      setRect(null)
    }
  }, [current.target])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      document.querySelectorAll('.tour-highlight-target').forEach((el) => el.classList.remove('tour-highlight-target'))
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
    <div className="tour-backdrop">
      {rect && (
        <div
          className="tour-spotlight-ring"
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
            Skip tour
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 12px' }} onClick={back}>← Back</button>
            )}
            <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={next}>
              {step === STEPS.length - 1 ? 'Get started' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
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

  // Prefer placing below the target; flip above if not enough room.
  let top = rect.bottom + margin
  if (top + 220 > viewportH) top = Math.max(margin, rect.top - 220 - margin)

  let left = rect.left
  if (left + cardWidth > viewportW - margin) left = viewportW - cardWidth - margin
  if (left < margin) left = margin

  return { top, left, width: cardWidth }
}
