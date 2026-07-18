import { useMemo, useState } from 'react'
import { DateTime } from 'luxon'
import { apiPost } from '../api/client'
import { replicate } from '../api/replicator'
import type { Event } from '../api/types'

type PropType = {
  // Omit event to add; pass it to edit.
  event?: Event
  onClose: () => void
  // Called with the event's id after a successful save.
  onSaved: (eventId: number) => void
}

// Ported from the Angular EventNewCtrl + event-new.html, covering add and edit.
// Fields: name required, multiplier ("Number of Runs") integer 1-100, date
// required. Native date input replaces the old datepicker.
export function EventForm({ event, onClose, onSaved }: PropType) {
  const isEdit = !!event

  const [name, setName] = useState(event?.eventName ?? '')
  const [multiplier, setMultiplier] = useState(event?.multiplier ?? 1)
  // Native date input wants 'YYYY-MM-DD'; the wire format is an ISO string.
  const [date, setDate] = useState(
    event ? DateTime.fromISO(event.eventDate).toFormat('yyyy-MM-dd') : '',
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = useMemo(
    () =>
      name.trim().length > 0 &&
      date.length > 0 &&
      Number.isInteger(multiplier) &&
      multiplier >= 1 &&
      multiplier <= 100,
    [name, date, multiplier],
  )

  async function submit() {
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)
    // Backend runs the date through moment(), so 'YYYY-MM-DD' is fine.
    try {
      if (isEdit) {
        await apiPost('/api/eventUpdate', {
          eventId: event.eventId,
          name,
          date,
          multiplier,
        })
        replicate(event.eventId)
        onSaved(event.eventId)
      } else {
        const result = await apiPost<{ insertId: number }>(
          '/api/eventNewSave',
          { name, date, multiplier },
        )
        replicate(result.insertId)
        onSaved(result.insertId)
      }
    } catch (e: unknown) {
      setError(String(e))
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <h2>{isEdit ? 'Edit Event' : 'New Event'}</h2>

      <div className="modal-body">
        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        <fieldset>
          <label htmlFor="name">Event Name</label>
          <input
            id="name"
            className="form-control"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </fieldset>

        <fieldset>
          <label htmlFor="multiplier">Number of Runs</label>
          <input
            id="multiplier"
            className="form-control"
            type="number"
            min={1}
            max={100}
            step={1}
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.valueAsNumber)}
            required
          />
          <p className="help-block">Number of times each car will run.</p>
        </fieldset>

        <fieldset>
          <label htmlFor="date">Event Date</label>
          <input
            id="date"
            className="form-control"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </fieldset>

        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!valid || submitting}
          >
            {submitting
              ? isEdit
                ? 'Saving…'
                : 'Creating…'
              : isEdit
                ? 'Update'
                : 'Create'}
          </button>
        </div>
      </div>
    </form>
  )
}
