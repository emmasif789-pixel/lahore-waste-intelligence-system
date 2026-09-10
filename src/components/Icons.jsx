import React from 'react'

// Minimal, consistent line-icon set (stroke-based, currentColor) used in place
// of emoji inside KPI cards, hotspot cards, and map/detail panels. Kept to one
// visual language (round caps/joins, 1.8 stroke) so nothing looks mixed.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ size = 16, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
      {children}
    </svg>
  )
}

export const IconMap = (p) => (
  <Svg {...p}>
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </Svg>
)

export const IconAlertTriangle = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 21.5 20h-19z" />
    <line x1="12" y1="9.5" x2="12" y2="14" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconRecycle = (p) => (
  <Svg {...p}>
    <path d="M7 19H4.8a2 2 0 0 1-1.73-3l3.4-5.9" />
    <path d="M9.5 4.6 12 3.2l2.5 4.3" />
    <path d="M17.9 12.6 20.5 17a2 2 0 0 1-1.73 3H14" />
    <path d="M8.5 19h6" />
    <path d="M12.5 12.5 15 8" />
    <path d="M6.8 15.8 9 12" />
  </Svg>
)

export const IconRepeat = (p) => (
  <Svg {...p}>
    <path d="M17 2 21 6l-4 4" />
    <path d="M3 12v-1a4 4 0 0 1 4-4h14" />
    <path d="M7 22 3 18l4-4" />
    <path d="M21 12v1a4 4 0 0 1-4 4H3" />
  </Svg>
)

export const IconFlame = (p) => (
  <Svg {...p}>
    <path d="M12 2s-5 5.2-5 10a5 5 0 0 0 10 0c0-1.6-.8-2.7-1.5-3.6.1 1.2-.5 2-1.2 2.1C15 9 14.5 6.8 12 2z" />
  </Svg>
)

export const IconFileText = (p) => (
  <Svg {...p}>
    <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
    <path d="M14 3v5h5" />
    <line x1="8.5" y1="13" x2="15.5" y2="13" />
    <line x1="8.5" y1="17" x2="15.5" y2="17" />
  </Svg>
)

export const IconDownload = (p) => (
  <Svg {...p}>
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M4 19.5h16" />
  </Svg>
)

export const IconX = (p) => (
  <Svg {...p}>
    <line x1="5" y1="5" x2="19" y2="19" />
    <line x1="19" y1="5" x2="5" y2="19" />
  </Svg>
)

export const IconChevronUp = (p) => (
  <Svg {...p}><polyline points="6 15 12 9 18 15" /></Svg>
)
export const IconChevronDown = (p) => (
  <Svg {...p}><polyline points="6 9 12 15 18 9" /></Svg>
)
export const IconChevronLeft = (p) => (
  <Svg {...p}><polyline points="15 6 9 12 15 18" /></Svg>
)
export const IconChevronRight = (p) => (
  <Svg {...p}><polyline points="9 6 15 12 9 18" /></Svg>
)
export const IconArrowRight = (p) => (
  <Svg {...p}>
    <line x1="4" y1="12" x2="19" y2="12" />
    <polyline points="13 6 19 12 13 18" />
  </Svg>
)

export const IconGlobe = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
  </Svg>
)

export const IconCamera = (p) => (
  <Svg {...p}>
    <path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="14" r="3.5" />
  </Svg>
)

export const IconCheckCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="8 12.5 11 15.5 16 9" />
  </Svg>
)

export const IconMapPin = (p) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.3" />
  </Svg>
)

export const IconClipboardList = (p) => (
  <Svg {...p}>
    <rect x="6" y="4" width="12" height="17" rx="1.5" />
    <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    <line x1="9" y1="10" x2="15" y2="10" />
    <line x1="9" y1="14" x2="15" y2="14" />
    <line x1="9" y1="18" x2="13" y2="18" />
  </Svg>
)
