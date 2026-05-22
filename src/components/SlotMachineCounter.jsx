import { useEffect, useState } from 'react'

// Six-digit slot-machine counter for the buy box wizard live match pool.
// Brady-locked: 6 reels, comma after the third digit (max display 999,999).
// States:
//   'idle'     — no asset class picked, render dashes silently
//   'spinning' — reels animate through 0–9 at varied speeds
//   'resolved' — each reel reveals its target digit with a staggered drop
//   'error'    — all reels show dashes; aria-label distinguishes timeout vs server
// prefers-reduced-motion is honored via CSS.

const REELS = 6
const COMMA_BEFORE_INDEX = 3 // 6 → 0 1 2 , 3 4 5 (comma between idx 2 and 3)
const MAX_DISPLAY = 999_999

export default function SlotMachineCounter({ value, state, errorKind }) {
  const showDigits = state === 'resolved' && typeof value === 'number'
  const clamped = showDigits ? Math.min(Math.max(0, Math.floor(value)), MAX_DISPLAY) : null
  const digits = clamped != null
    ? String(clamped).padStart(REELS, '0').split('').map(Number)
    : null

  const showDashes = state === 'error' || state === 'idle'

  const cells = []
  for (let idx = 0; idx < REELS; idx++) {
    if (idx === COMMA_BEFORE_INDEX) {
      cells.push(<span key={`c-${idx}`} className="slot-comma" aria-hidden="true">,</span>)
    }
    if (showDashes) {
      cells.push(<span key={`d-${idx}`} className={`slot-cell slot-cell-dash slot-cell-dash-${state}`}>–</span>)
    } else {
      cells.push(
        <Reel
          key={`r-${idx}`}
          targetDigit={digits ? digits[idx] : null}
          state={state}
          idx={idx}
        />
      )
    }
  }

  let ariaLabel
  if (state === 'idle') ariaLabel = 'Select an asset class to start'
  else if (state === 'error' && errorKind === 'timeout') ariaLabel = 'Match count timed out. Try narrower filters.'
  else if (state === 'error') ariaLabel = 'Match count unavailable. Backend error.'
  else if (state === 'resolved' && clamped != null) ariaLabel = `${clamped.toLocaleString('en-US')} matches`
  else ariaLabel = 'Calculating matches'

  let title
  if (state === 'idle') title = 'Select an asset class to start.'
  else if (state === 'error' && errorKind === 'timeout') title = 'Preview timed out (>8s). Try narrower filters.'
  else if (state === 'error') title = 'Preview backend error. Counter will retry on next edit.'

  return (
    <span
      className={`slot-counter slot-counter-${state}`}
      aria-live="polite"
      aria-label={ariaLabel}
      title={title}
    >
      {cells}
    </span>
  )
}

function Reel({ targetDigit, state, idx }) {
  // Snap state is reset by deriving it from input changes during render — the
  // React-canonical pattern, not inside an effect. The setTimeout-driven snap
  // (resolved → true after a staggered delay) stays in useEffect because timers
  // are async and don't trip the set-state-in-effect lint rule.
  // Reference: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [snapped, setSnapped] = useState(false)
  const inputKey = `${state}-${targetDigit}`
  const [prevInputKey, setPrevInputKey] = useState(inputKey)
  if (prevInputKey !== inputKey) {
    setPrevInputKey(inputKey)
    setSnapped(false)
  }

  useEffect(() => {
    if (state === 'resolved' && targetDigit != null) {
      const delay = 80 + idx * 90
      const timer = setTimeout(() => setSnapped(true), delay)
      return () => clearTimeout(timer)
    }
  }, [state, targetDigit, idx])

  if (snapped && targetDigit != null) {
    return <span className="slot-cell slot-cell-resolved">{targetDigit}</span>
  }

  const speedMs = 95 + (idx * 17)
  return (
    <span className="slot-cell slot-cell-spinning">
      <span className="slot-strip" style={{ animationDuration: `${speedMs}ms` }}>
        {[0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9].map((d, i) => (
          <span className="slot-strip-cell" key={i}>{d}</span>
        ))}
      </span>
    </span>
  )
}
