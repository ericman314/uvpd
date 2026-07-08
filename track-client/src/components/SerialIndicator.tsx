import './SerialIndicator.scss'

// Stub for the track/serial-port indicator. In the Angular app this showed the
// per-lane pin states (event.html .pinStateIndicator) driven by socket.io
// serialState / pinStateChange events. Wiring to the live socket feed is
// deferred along with the rest of the race machinery; for now it renders a
// static placeholder so the layout is in place.
export function SerialIndicator() {
  return (
    <div className="pin-state-indicator" title="Serial/track status (stub)">
      <span className="serial-status">Track: —</span>
      <span className="lane-color-1">·</span>
      <span className="lane-color-2">·</span>
      <span className="lane-color-3">·</span>
      <span className="lane-color-4">·</span>
    </div>
  )
}
