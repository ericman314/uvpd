import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DateTime } from 'luxon'
import { apiGet, apiPost } from '../api/client'
import {
  replicateNow,
  replicateResultDelete,
  replicateEventDelete,
  replicateEventDeleteResults,
} from '../api/replicator'
import type { Car, Event, Result } from '../api/types'
import { SerialIndicator } from '../components/SerialIndicator'
import { Dropdown } from '../components/Dropdown'
import { useToast } from '../components/toast/useToast'
import { ResultsList } from '../components/ResultsList'
import { Modal } from '../components/Modal'
import { CarForm } from './CarForm'
import { EventForm } from './EventForm'
import { useConfirm } from '../hooks/useConfirm'
import { resultsSorter } from '../utils/helpers'
import './EventDetail.scss'

// A car's achievements arrive as a comma-joined string; split for display.
type CarWithAchievements = Car & { achievementList: string[] }

export function EventDetail() {
  const { eventId } = useParams()
  const navigate = useNavigate()

  const [event, setEvent] = useState<Event | null>(null)
  const [cars, setCars] = useState<CarWithAchievements[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showAddCar, setShowAddCar] = useState(false)
  const [showEditEvent, setShowEditEvent] = useState(false)
  const [replicating, setReplicating] = useState(false)
  const { showConfirm, confirmContent } = useConfirm()
  const showToast = useToast()

  const loadEventCarsResults = useCallback(async () => {
    try {
      const data = await apiGet<{
        event: Event
        cars: Car[]
        results: Result[]
      }>(`/api/eventCarsResults?eventId=${eventId}`)
      setEvent(data.event)
      setCars(
        data.cars.map((c) => ({
          ...c,
          achievementList: c.achievements ? c.achievements.split(',') : [],
        })),
      )
      setResults([...data.results].sort(resultsSorter))
    } catch (e: unknown) {
      setError(String(e))
    }
  }, [eventId])

  useEffect(() => {
    loadEventCarsResults()
  }, [loadEventCarsResults])

  // Cars keyed by id, so a result can name its car (EventCtrl.getCarFromResult).
  const carsById = useMemo(() => {
    const map = new Map<number, CarWithAchievements>()
    cars.forEach((c) => map.set(c.carId, c))
    return map
  }, [cars])

  // Duplicate car-name warning (EventCtrl.duplicateName).
  const duplicateName = useMemo(() => {
    const names = cars.map((c) => c.carName).sort()
    for (let i = 0; i < names.length - 1; i++) {
      if (names[i] === names[i + 1]) return names[i]
    }
    return null
  }, [cars])

  async function deleteResult(result: Result) {
    if (!event) return
    const ok = await showConfirm({
      title: 'Delete result',
      message: 'Delete this result?',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await apiPost('/api/resultDelete', { resultId: result.resultId })
      setResults((prev) => prev.filter((r) => r.resultId !== result.resultId))
    } catch (e: unknown) {
      setError(String(e))
      return
    }
    // Local delete succeeded; a cloud failure now leaves a phantom row that no
    // replicate can clean up, so warn the operator to re-sync.
    try {
      await replicateResultDelete(result.resultId)
    } catch (e: unknown) {
      showToast(`Deleted locally, but cloud delete failed: ${e}`, 'error')
    }
  }

  async function deleteEvent() {
    if (!event) return
    const ok = await showConfirm({
      title: 'Delete event',
      message: `Delete event "${event.eventName}"? This cannot be undone.`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await apiPost('/api/eventDelete', { eventId: event.eventId })
    } catch (e: unknown) {
      setError(String(e))
      return
    }
    // Local delete done. If the cloud delete fails the event stays live on the
    // public site with no local record — warn before navigating away.
    try {
      await replicateEventDelete(event.eventId)
    } catch (e: unknown) {
      showToast(`Deleted locally, but cloud delete failed — event still live: ${e}`, 'error')
    }
    navigate('/events-list')
  }

  async function deleteResults() {
    if (!event) return
    const ok = await showConfirm({
      title: 'Delete all results',
      message: 'Delete ALL results for this event?',
      confirmLabel: 'Delete all',
    })
    if (!ok) return
    try {
      await apiPost('/api/eventDeleteResults', { eventId: event.eventId })
      setResults([])
    } catch (e: unknown) {
      setError(String(e))
      return
    }
    // Local delete done; a cloud failure leaves phantom results on the public
    // site that no replicate can remove — warn to re-sync.
    try {
      await replicateEventDeleteResults(event.eventId)
    } catch (e: unknown) {
      showToast(`Deleted locally, but cloud delete failed: ${e}`, 'error')
    }
  }

  async function handleReplicate() {
    if (!event) return
    setReplicating(true)
    try {
      await replicateNow(event.eventId)
      showToast('Replicated to cloud', 'success')
    } catch (e: unknown) {
      showToast(`Replication failed: ${e}`, 'error')
    } finally {
      setReplicating(false)
    }
  }

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>
  if (!event) return <p>Loading…</p>

  return (
    <div className="EventDetail">
      <p>
        <Link to="/events-list">Back to all events</Link>
      </p>

      <SerialIndicator />

      <h1>{event.eventName}</h1>
      <p>{DateTime.fromISO(event.eventDate).toFormat('LLL dd, yyyy')}</p>

      {/* Action menu + race sub-screen buttons. */}
      <div className="actions-row">
        <Dropdown label="Action ▾" buttonClassName="btn-primary">
          <ul>
          <li>
            <button type="button" onClick={() => setShowEditEvent(true)}>
              Edit event
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={handleReplicate}
              disabled={replicating}
            >
              {replicating ? 'Replicating…' : 'Replicate event'}
            </button>
          </li>
          <li>
            <a
              href={`/api/results.csv?eventId=${event.eventId}`}
              target="_blank"
              rel="noreferrer"
            >
              Download results
            </a>
          </li>
          <li>
            <button type="button" onClick={deleteResults}>
              Delete all results
            </button>
          </li>
          <li>
            <button type="button" onClick={deleteEvent}>
              Delete event
            </button>
          </li>
        </ul>
      </Dropdown>

        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate(`/events/${event.eventId}/race`)}
        >
          START RACE
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate(`/events/${event.eventId}/welcome`)}
        >
          Welcome screen
        </button>
      </div>

      <h2>Cars ({cars.length})</h2>
      <p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowAddCar(true)}
        >
          Add car
        </button>
      </p>
      {duplicateName && (
        <p style={{ color: 'red', fontWeight: 'bold' }}>
          Duplicate name: {duplicateName}
        </p>
      )}

      <div className="cars-grid">
        {cars.map((car) => (
          <div key={car.carId} className="car-cell">
            <Link to={`/car/${car.carId}`}>
              <img src={`/cars/${car.carId}.jpg`} alt={car.carName} />
              <p className="car-name">{car.carName}</p>
              <p className="car-nickname">
                <i>{car.nickname || ' '}</i>
              </p>
            </Link>
          </div>
        ))}
      </div>

      <h2>Results</h2>
      <ResultsList
        results={results}
        carName={(result) => carsById.get(result.carId)?.carName}
        onDelete={deleteResult}
      />

      <Modal open={showAddCar} onClose={() => setShowAddCar(false)} className="wide">
        <CarForm
          eventId={event.eventId}
          onClose={() => setShowAddCar(false)}
          onSaved={() => {
            setShowAddCar(false)
            loadEventCarsResults()
          }}
        />
      </Modal>

      <Modal open={showEditEvent} onClose={() => setShowEditEvent(false)}>
        <EventForm
          event={event}
          onClose={() => setShowEditEvent(false)}
          onSaved={() => {
            setShowEditEvent(false)
            loadEventCarsResults()
          }}
        />
      </Modal>

      {confirmContent}
    </div>
  )
}
