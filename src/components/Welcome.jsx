import React from 'react'

export default function Welcome({ onExplore, onReport, onGuide }) {
  return (
    <div className="modal-backdrop" style={{ zIndex: 950 }}>
      <div className="report-modal" style={{ width: 500 }}>
        <div style={{ padding: '30px 28px 10px', textAlign: 'center' }}>
          <div style={{
            width: 54, height: 54, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--accent), #8a6323)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#0a0e13',
          }}>LWI</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, marginBottom: 8 }}>
            Lahore Waste Intelligence System
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
            A city-operations platform that maps waste hotspots, scores cleanup priority, and turns citizen photo reports into intelligence a city can actually act on.
          </div>
        </div>

        <div style={{ padding: '24px 28px 8px' }}>
          <div className="field-label" style={{ textAlign: 'center', marginBottom: 14 }}>How would you like to start?</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ChoiceButton
              icon="✦"
              title="Take the guided tour"
              detail="A short walkthrough of why this exists, what each part does, and how to use it"
              onClick={onGuide}
              featured
            />
            <ChoiceButton
              icon="🗺️"
              title="Explore the map myself"
              detail="Jump straight in and browse hotspots, areas, and city intelligence"
              onClick={onExplore}
            />
            <ChoiceButton
              icon="📸"
              title="Report waste now"
              detail="Submit a photo report and see the AI analysis and priority scoring in action"
              onClick={onReport}
            />
          </div>
        </div>

        <div style={{ padding: '18px 28px 22px', textAlign: 'center' }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            You can restart the guide anytime from the ❔ button in the top bar.
          </div>
        </div>
      </div>
    </div>
  )
}

function ChoiceButton({ icon, title, detail, onClick, featured }) {
  return (
    <button
      onClick={onClick}
      className="welcome-choice-btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textAlign: 'left',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        border: featured ? '1px solid var(--accent)' : '1px solid var(--panel-border)',
        background: featured ? 'var(--accent-soft)' : 'var(--panel-2)',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 13.5, color: featured ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>{detail}</span>
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>→</span>
    </button>
  )
}
