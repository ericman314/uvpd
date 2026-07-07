import { useMemo, useState } from 'react'
import { apiPost } from '../api/client'

type PropType = {
  onClose: () => void
  onCreated: (eventId: number) => void
}

// Ported from the Angular EventNewCtrl + event-new.html. Rendered inside the
// Modal (matching the original, which was a Bootstrap modal). Fields and
// validation match: name required, multiplier ("Number of Runs") an integer
// 1-100, date required. Native date input replaces the old datepicker widget.
export function EventNew({ onClose, onCreated }:PropType) {
  const [name, setName] = useState('')
  const [multiplier, setMultiplier] = useState(1)
  const [date, setDate] = useState('') // native input: 'YYYY-MM-DD'
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
    try {
      // Backend runs the date through moment(), so 'YYYY-MM-DD' is fine.
      const result = await apiPost<{ insertId: number }>('/api/eventNewSave', {
        name,
        date,
        multiplier,
      })
      onCreated(result.insertId)
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
      <h2>New Event</h2>

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
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </div>
      </div>
    </form>
  )
}