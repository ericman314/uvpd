import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DateTime } from 'luxon'
import { apiGet } from '../api/client'
import type { Event } from '../api/types'
import { Modal } from '../components/Modal'
import { EventNew } from './EventNew'

// Ported from the Angular events-list route (EventListCtrl + events-list.html).
// The old controller carried a lot of dead code (event-code login, data-all/
// data-upsert socket handlers, refactorData) that the template never used; only
// the event list + navigation is live, so that's all this ports.
export function EventsList() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const response = await apiGet<Event[]>('/api/eventList')
        setEvents(response)
      } catch (e: unknown) {
        setError(String(e))
      }
    })()
  }, [])

  // Sorted by date, newest first (matches `orderBy: 'eventDate' : true`).
  const sorted = useMemo(() => [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate)), [events])

  return (
    <div className="EventsList">
      <h1>Events</h1>

      <p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowNew(true)}
        >
          New Event
        </button>
      </p>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {sorted.map((event) => (
        <p key={event.eventId}>
          <Link to={`/events/${event.eventId}`}>
            {event.eventName} &mdash;{' '}
            {DateTime.fromISO(event.eventDate).toFormat('LLL dd, yyyy')}
          </Link>
        </p>
      ))}

      <p>
        <Link to="/calibrate">Calibrate Scale</Link>
      </p>

      <Modal open={showNew} onClose={() => setShowNew(false)}>
        <EventNew
          onClose={() => setShowNew(false)}
          onCreated={(eventId) => navigate(`/events/${eventId}`)}
        />
      </Modal>
    </div>
  )
}