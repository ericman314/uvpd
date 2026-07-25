import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DateTime } from 'luxon'
import { apiGet } from '../api/client'
import { replicateNow } from '../api/replicator'
import type { Event } from '../api/types'
import { Modal } from '../components/Modal'
import { Dropdown } from '../components/Dropdown'
import { useToast } from '../components/toast/useToast'
import { useConfirm } from '../hooks/useConfirm'
import { EventForm } from './EventForm'

// Ported from the Angular events-list route (EventListCtrl + events-list.html).
// The old controller carried a lot of dead code (event-code login, data-all/
// data-upsert socket handlers, refactorData) that the template never used; only
// the event list + navigation is live, so that's all this ports.
export function EventsList() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [replicating, setReplicating] = useState(false)
  const showToast = useToast()
  const { showConfirm, confirmContent } = useConfirm()

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

  async function handleReplicate() {
    // Full replicate is a complete replace: it overwrites all cloud event data
    // with this laptop's copy. Confirm before the destructive sync.
    const ok = await showConfirm({
      title: 'Replicate entire DB',
      message:
        'This replaces ALL event data on the public site with this laptop’s copy. Continue?',
      confirmLabel: 'Replicate',
    })
    if (!ok) return
    setReplicating(true)
    try {
      await replicateNow()
      showToast('Replicated to cloud', 'success')
    } catch (e: unknown) {
      showToast(`Replication failed: ${e}`, 'error')
    } finally {
      setReplicating(false)
    }
  }

  return (
    <div className="EventsList">
      <h1>Events</h1>

      <div className="actions-row">
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowNew(true)}
        >
          New Event
        </button>
        <Dropdown label="Action ▾" buttonClassName="btn-primary">
          <ul>
            <li>
              <button
                type="button"
                onClick={handleReplicate}
                disabled={replicating}
              >
                {replicating ? 'Replicating…' : 'Replicate DB'}
              </button>
            </li>
          </ul>
        </Dropdown>
      </div>
      <br />

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
        <EventForm
          onClose={() => setShowNew(false)}
          onSaved={(eventId) => navigate(`/events/${eventId}`)}
        />
      </Modal>

      {confirmContent}
    </div>
  )
}