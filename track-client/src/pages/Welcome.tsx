import { useNavigate, useParams } from 'react-router-dom'
import './Welcome.scss'

// Ported from the Angular event-details.welcome route (welcome.html): a
// full-screen black slide with the welcome image, shown on the projector before
// a race. Click or Escape returns to the event page.
export function Welcome() {
  const { eventId } = useParams()
  const navigate = useNavigate()

  function exit() {
    navigate(`/events/${eventId}`)
  }

  return (
    <div
      className="Welcome"
      onClick={exit}
      onKeyDown={(e) => e.key === 'Escape' && exit()}
      tabIndex={0}
      role="button"
      aria-label="Welcome screen — click to return"
    >
      <div className="fullpage">
        <img src="/img/welcome-screen.png" alt="Welcome" />
      </div>
    </div>
  )
}
