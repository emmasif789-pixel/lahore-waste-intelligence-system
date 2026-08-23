import { useEffect, useRef, useState } from 'react'

// Animates a number from 0 (or its previous value) to the target value
// whenever the target changes. Keeps stat cards feeling alive without any
// external animation library.
export function useCountUp(target, duration = 700) {
  const [display, setDisplay] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef(null)

  useEffect(() => {
    const from = fromRef.current
    const to = target
    if (from === to) {
      setDisplay(to)
      return
    }
    const start = performance.now()
    cancelAnimationFrame(rafRef.current)

    function tick(now) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const value = from + (to - from) * eased
      setDisplay(value)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return display
}
