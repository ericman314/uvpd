import { useEffect, useMemo, useState } from 'react'
import { DateTime } from 'luxon'
import { fetchCheckinList } from '../api/checkin'
import { getPublicSiteUrl } from '../api/cloud'
import type { Checkin } from '../api/types'
import './CheckinPicker.scss'

type PropType = {
  eventId: number
  onPick: (checkin: Checkin) => void
  onClose: () => void
}

// Ported from the Angular AddFromMobileCheckin: a grid of cars parents
// pre-registered online, pulled from the cloud. Two filters (this-event/all,
// unadded/all). Picking one hands it back to the caller (CarForm).
export function CheckinPicker({ eventId, onPick, onClose }: PropType) {
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [showAddedCars, setShowAddedCars] = useState(false)
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [publicSiteUrl, setPublicSiteUrl] = useState('')
  const [message, setMessage] = useState('Please wait…')

  useEffect(() => {
    (async () => {
      setMessage('Please wait…')
      try {
        const [list, url] = await Promise.all([
          fetchCheckinList({ eventId, showAllEvents, showAddedCars }),
          getPublicSiteUrl(),
        ])
        setPublicSiteUrl(url)
        setCheckins(list)
        setMessage(list.length === 0 ? 'No cars have been checked in yet' : '')
      } catch (e: unknown) {
        setMessage(String(e))
      }
    })()
  }, [eventId, showAllEvents, showAddedCars])

  const rows = useMemo(
    () =>
      checkins.map((c) => ({
        ...c,
        photo: `${publicSiteUrl}/api/v3/checkin/${c.checkInId}.jpg`,
        when: DateTime.fromISO(c.time).toFormat('L/d h:mm a'),
      })),
    [checkins, publicSiteUrl],
  )

  return (
    <div className="CheckinPicker">
      <h2>Add from mobile check-in</h2>

      <div className="modal-body">
        <fieldset>
          <div className="btn-group">
            <button
              type="button"
              className={!showAllEvents ? 'btn-primary' : ''}
              onClick={() => setShowAllEvents(false)}
            >
              Only this event
            </button>
            <button
              type="button"
              className={showAllEvents ? 'btn-primary' : ''}
              onClick={() => setShowAllEvents(true)}
            >
              All events
            </button>
          </div>&nbsp;&nbsp;&nbsp;&nbsp;
          <div className="btn-group">
            <button
              type="button"
              className={!showAddedCars ? 'btn-primary' : ''}
              onClick={() => setShowAddedCars(false)}
            >
              Only unadded cars
            </button>
            <button
              type="button"
              className={showAddedCars ? 'btn-primary' : ''}
              onClick={() => setShowAddedCars(true)}
            >
              All cars
            </button>
          </div>
        </fieldset>

        {message && <p className="checkin-message">{message}</p>}

        <div className="checkin-grid">
          {rows.map((c) => (
            <button
              key={c.checkInId}
              type="button"
              className="checkin-cell"
              onClick={() => onPick(c)}
            >
              <img src={c.photo} alt={c.carName} />
              <p className="checkin-name">
                {c.carName} | {c.nickname} | {c.den}
              </p>
              <p className="checkin-time">{c.when}</p>
            </button>
          ))}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
