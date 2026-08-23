import React from 'react'

export default function Welcome({ onDismiss, onStartReport }) {
  return (
    <div className="modal-backdrop" style={{ zIndex: 950 }}>
      <div className="report-modal" style={{ width: 480 }}>
        <div style={{ padding: '28px 26px 8px', textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--accent), #8a6323)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#0a0e13',
          }}>LWI</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, marginBottom: 6 }}>
            Lahore Waste Intelligence System
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
            A city-operations platform that maps waste hotspots, scores cleanup priority, and turns citizen photo reports into actionable intelligence.
          </div>
        </div>

        <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <WelcomeStep num="1" title="Explore the map" detail="Colored pins mark waste hotspots by severity. Tap any pin for a full intelligence breakdown." />
          <WelcomeStep num="2" title="Check area intelligence" detail="Pick a neighborhood in the side panel to see why it's a priority zone." />
          <WelcomeStep num="3" title="Report waste" detail="Snap a photo — AI analyzes composition, hazards, and recovery potential, then scores it for cleanup priority." />
        </div>

        <div className="report-modal-footer" style={{ justifyContent: 'center', gap: 10 }}>
          <button className="btn-ghost" onClick={onDismiss}>Explore the map</button>
          <button className="btn-primary" onClick={onStartReport}>📸 Try a report now</button>
        </div>
      </div>
    </div>
  )
}

function WelcomeStep({ num, title, detail }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)',
        fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1,
      }}>{num}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{detail}</div>
      </div>
    </div>
  )
}
