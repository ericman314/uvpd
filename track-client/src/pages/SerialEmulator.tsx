import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiPost } from '../api/client'
import './SerialEmulator.scss'

// Standalone serial-emulator page. Open it in a second tab to drive a race
// while watching the result in the first tab. Each button POSTs a raw serial
// line to /api/simulate, which feeds the same handleSerialData the real port
// uses — so the race screen can be exercised with no Arduino attached. No state
// is enforced (every command is always available); the server reacts to
// whatever line it receives, just like real hardware.
//
// The wire uses raw lanes 0..3; the server flips them to display lanes 4..1
// via 5-(1+raw), and the race-view lane colors key off that display number.
// Trigger time is entered in seconds and sent as microseconds (server does
// micros * 1e-6), matching the Angular sim (Trigger,<lane>,<micros>).
//
// Race behavior per lane, decided at Start from whether its input has a value:
//   empty  -> live timer: the field counts up (rAF) to a 6s cap; pressing that
//             lane's Trigger sends the current elapsed time and stops it. At the
//             cap it just freezes (no send) — a DNF that times out.
//   value  -> scheduled: the field stays put and the Trigger auto-fires after
//             that many seconds. (Trigger can still be pressed early.)
// Ready clears all inputs and resets the race. Start is ignored mid-race.

const LANES = [3, 2, 1, 0].map((raw) => ({ raw, display: 5 - (1 + raw) }))
const RAW_LANES = [0, 1, 2, 3]

// Pin states: covered = P=0 (car staged, beam blocked), uncovered = P=1.
const COVERED = 0
const UNCOVERED = 1

const CAP_SECONDS = 6

function send(line: string) {
  apiPost('/api/simulate', { line }).catch((e) =>
    console.error('simulate failed', line, e),
  )
}

function sendTrigger(raw: number, seconds: number) {
  send(`Trigger,${raw},${Math.floor(seconds * 1e6)}`)
}

// Per-lane runtime state during a race. Held in a ref so the rAF loop and the
// scheduled timers read/mutate it without stale closures.
type LaneRun = {
  mode: 'live' | 'scheduled'
  done: boolean // trigger already sent (or capped) — no more sends
  startedAt: number // performance.now() at Start, for live count-up
  scheduledId: ReturnType<typeof setTimeout> | null
}

export function SerialEmulator() {
  // Displayed value per lane (seconds, as a string). Edited by the user before
  // a race; animated by the rAF loop for live lanes during one.
  const [times, setTimes] = useState<Record<number, string>>({
    0: '2.5',
    1: '2.7',
    2: '2.9',
    3: '3.1',
  })
  const [racing, setRacing] = useState(false)
  const [pin, setPin] = useState<Record<number, number>>({
    0: UNCOVERED,
    1: UNCOVERED,
    2: UNCOVERED,
    3: UNCOVERED,
  })

  const runs = useRef<Record<number, LaneRun>>({})
  const rafId = useRef<number | null>(null)

  // Establish a known initial state on the server: all lanes uncovered (P=1).
  useEffect(() => {
    RAW_LANES.forEach((raw) => send(`Pin state change,${raw},${UNCOVERED}`))
    return () => stopEngine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopEngine() {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    rafId.current = null
    RAW_LANES.forEach((raw) => {
      const run = runs.current[raw]
      if (run?.scheduledId) clearTimeout(run.scheduledId)
    })
    runs.current = {}
  }

  // Any live lane still counting up?
  function hasActiveLive() {
    return RAW_LANES.some((raw) => {
      const r = runs.current[raw]
      return r?.mode === 'live' && !r.done
    })
  }

  // rAF loop: advance every live lane's displayed time toward the cap.
  function frame() {
    const now = performance.now()
    setTimes((prev) => {
      const next = { ...prev }
      RAW_LANES.forEach((raw) => {
        const run = runs.current[raw]
        if (run?.mode === 'live' && !run.done) {
          const elapsed = (now - run.startedAt) / 1000
          if (elapsed >= CAP_SECONDS) {
            run.done = true // freeze at cap, send nothing
            next[raw] = CAP_SECONDS.toFixed(2)
          } else {
            next[raw] = elapsed.toFixed(2)
          }
        }
      })
      return next
    })
    if (hasActiveLive()) {
      rafId.current = requestAnimationFrame(frame)
    } else {
      rafId.current = null
    }
  }

  function handleReady() {
    send('Ready')
    stopEngine()
    setRacing(false)
    setTimes({ 0: '', 1: '', 2: '', 3: '' })
  }

  function handleStart() {
    if (racing) return // ignore Start mid-race
    send('Start')
    setRacing(true)

    const t0 = performance.now()
    RAW_LANES.forEach((raw) => {
      const entered = parseFloat(times[raw])
      if (Number.isFinite(entered)) {
        // Scheduled: auto-fire this lane's trigger after the entered delay.
        const scheduledId = setTimeout(() => {
          const run = runs.current[raw]
          if (!run || run.done) return
          run.done = true
          sendTrigger(raw, entered)
        }, entered * 1000)
        runs.current[raw] = {
          mode: 'scheduled',
          done: false,
          startedAt: t0,
          scheduledId,
        }
      } else {
        // Live: count up in the field until Trigger or the 6s cap.
        runs.current[raw] = {
          mode: 'live',
          done: false,
          startedAt: t0,
          scheduledId: null,
        }
      }
    })

    if (hasActiveLive() && rafId.current === null) {
      rafId.current = requestAnimationFrame(frame)
    }
  }

  // Manual trigger: send the lane's current value and stop it. For a live lane
  // that's the elapsed count-up; for a scheduled lane it's the entered value.
  // Also works before a race (no run yet): just sends the field value.
  function handleTrigger(raw: number) {
    const run = runs.current[raw]
    if (run) {
      if (run.done) return
      run.done = true
      if (run.scheduledId) clearTimeout(run.scheduledId)
    }
    const seconds = parseFloat(times[raw])
    if (!Number.isFinite(seconds)) return
    sendTrigger(raw, seconds)
  }

  function togglePin(raw: number) {
    const next = pin[raw] === COVERED ? UNCOVERED : COVERED
    send(`Pin state change,${raw},${next}`)
    setPin((prev) => ({ ...prev, [raw]: next }))
  }

  return (
    <div className="SerialEmulator">
      <p>
        <Link to="/events-list">Back to all events</Link>
      </p>

      <h1>Serial emulator</h1>
      <p className="emu-hint">
        Drive a race here while watching the result in another tab. Leave a lane
        blank to time it live; enter a value to auto-fire after that delay.
      </p>

      <div className="emu-row">
        <button type="button" onClick={handleReady}>
          R — Ready
        </button>
        <button type="button" onClick={handleStart} disabled={racing}>
          S — Start
        </button>
      </div>

      <div className="emu-lanes">
        {LANES.map(({ raw, display }) => (
          <div key={raw} className={`emu-lane lane-bg-${display}`}>
            <div className="emu-lane-label">Lane {raw}</div>
            <input
              type="number"
              step="0.01"
              value={times[raw]}
              onChange={(e) =>
                setTimes((prev) => ({ ...prev, [raw]: e.target.value }))
              }
            />
            <button type="button" onClick={() => handleTrigger(raw)}>
              Trigger
            </button>
            <button type="button" onClick={() => togglePin(raw)}>
              {pin[raw] === COVERED ? 'P=0 (Covered)' : 'P=1 (Uncovered)'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
