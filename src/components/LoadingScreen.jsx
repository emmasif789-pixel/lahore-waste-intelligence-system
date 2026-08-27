import React, { useEffect, useState } from 'react'

const MESSAGES = [
  'Connecting to the live map…',
  'Pulling in hotspot data…',
  'Checking today\'s priorities…',
  'Almost there…',
]

export default function LoadingScreen() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % MESSAGES.length), 850)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-mark">LWI</div>
        <div className="ai-pulse-dots" style={{ justifyContent: 'center', margin: '18px 0 12px' }}>
          <span></span><span></span><span></span>
        </div>
        <div key={i} className="loading-message">
          {MESSAGES[i]}
        </div>
      </div>
    </div>
  )
}
