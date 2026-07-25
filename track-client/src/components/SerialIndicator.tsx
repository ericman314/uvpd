import { useEffect, useState } from 'react'
import { getSocket } from '../api/socket'
import './SerialIndicator.scss'

// Per-lane pin-state indicator (ported from event.html .pinStateIndicator).
// Subscribes to the live socket feed: pinStateChange sets a lane's state.
// data.lane is the display lane (1..4) — the server already flipped the raw
// wire lane — so it indexes directly. States default to 1 (uncovered), matching
// the Angular init [, 1, 1, 1, 1].
const DISPLAY_LANES = [1, 2, 3, 4]

export function SerialIndicator() {
  const [pinStates, setPinStates] = useState<Record<number, number>>({
    1: 1,
    2: 1,
    3: 1,
    4: 1,
  })

  useEffect(() => {
    const socket = getSocket()
    const onPin = (data: { lane: number; state: number }) =>
      setPinStates((prev) => ({ ...prev, [data.lane]: data.state }))

    socket.on('pinStateChange', onPin)
    return () => {
      socket.off('pinStateChange', onPin)
    }
  }, [])

  return (
    <div className="pin-state-indicator">
      {DISPLAY_LANES.map((lane) => (
        <span key={lane} className={`lane-color-${lane}`}>
          {pinStates[lane]}
        </span>
      ))}
    </div>
  )
}
