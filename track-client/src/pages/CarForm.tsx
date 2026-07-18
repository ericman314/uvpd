import { useEffect, useMemo, useState } from 'react'
import { apiPost } from '../api/client'
import { replicate, sendImage } from '../api/replicator'
import { checkinImageAsDataUrl, markCheckinAdded } from '../api/checkin'
import type { Car, Checkin } from '../api/types'
import { CameraCapture } from '../components/CameraCapture'
import { CheckinPicker } from '../components/CheckinPicker'
import { Modal } from '../components/Modal'

type PropType = {
  // Add mode: pass eventId, omit car. Edit mode: pass the existing car.
  eventId?: number
  car?: Car
  onClose: () => void
  // Called with the car's id after a successful save.
  onSaved: (carId: number) => void
}

// Ported from the Angular AddCarsCtrl + addCars.html, covering both the add and
// edit paths (the Angular controller served both via its `options.model`).
// Fields: name/nickname/den/status + webcam photo, plus "add from mobile
// check-in" (add mode). Add -> /api/newCarSave, edit -> /api/carUpdate. Scale
// weight is still deferred.
export function CarForm({ eventId, car, onClose, onSaved }: PropType) {
  const isEdit = !!car

  const [carName, setCarName] = useState(car?.carName ?? '')
  const [nickname, setNickname] = useState(car?.nickname ?? '')
  const [den, setDen] = useState(car?.den ?? '')
  const [deferPerm, setDeferPerm] = useState(car?.deferPerm ?? 0)
  // In edit mode, seed the preview with the existing photo (cache-busted). A
  // fresh capture/rotate replaces this with a data: URL; we only send imageData
  // to the server when it's a new data: URL, so an unchanged photo is left be.
  const [image, setImage] = useState<string | null>(
    isEdit ? `/cars/${car.carId}.jpg?v=${Date.now()}` : null,
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  // Set when the car was picked from mobile check-in; on save we tell the cloud
  // it's been added so it drops off the unadded list.
  const [checkInId, setCheckInId] = useState<string | null>(null)

  async function handlePick(checkin: Checkin) {
    setShowPicker(false)
    setCarName(checkin.carName)
    setNickname(checkin.nickname ?? '')
    setDen(checkin.den ?? '')
    setDeferPerm(0)
    setCheckInId(checkin.checkInId)
    try {
      // Pull the checkin photo in as real image data so it saves with the car.
      setImage(await checkinImageAsDataUrl(checkin.checkInId))
    } catch (e: unknown) {
      setError(String(e))
    }
  }

  // Ctrl+M opens the mobile check-in picker (add mode only), matching the
  // Angular AddCarsCtrl shortcut.
  useEffect(() => {
    if (isEdit) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.code === 'KeyM') {
        e.preventDefault()
        setShowPicker(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isEdit])

  // Add mode requires a picture (matches original); edit already has one.
  const valid = useMemo(
    () => carName.trim().length > 0 && (isEdit || !!image),
    [carName, image, isEdit],
  )

  async function submit() {
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)
    // Only a freshly captured/rotated image is a data: URL worth sending; the
    // seeded /cars/*.jpg URL means "unchanged", so omit it on edit.
    const newImageData = image?.startsWith('data:') ? image : undefined
    try {
      let savedCarId: number
      let savedEventId: number | undefined
      let secret: string
      if (isEdit) {
        const res = await apiPost<{ secret: string }>('/api/carUpdate', {
          carId: car.carId,
          carName,
          nickname,
          den,
          deferPerm,
          ...(newImageData ? { imageData: newImageData } : {}),
        })
        savedCarId = car.carId
        savedEventId = car.eventId
        secret = res.secret
      } else {
        const res = await apiPost<{
          result: { insertId: number }
          secret: string
        }>('/api/newCarSave', {
          eventId,
          car: { carName, nickname, den, deferPerm, imageData: newImageData },
        })
        savedCarId = res.result.insertId
        savedEventId = eventId
        secret = res.secret
      }

      replicate(savedEventId)
      if (newImageData) await sendImage(savedCarId, newImageData, secret)
      // If this car came from mobile check-in, mark it added on the cloud.
      if (checkInId && savedEventId !== undefined) {
        await markCheckinAdded(checkInId, savedEventId)
      }
      onSaved(savedCarId)
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
      <h2>{isEdit ? 'Edit Car' : 'Add Car'}</h2>

      <div className="modal-body">
        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        <fieldset>
          <label htmlFor="carName">Name</label>
          <input
            id="carName"
            className="form-control"
            type="text"
            value={carName}
            onChange={(e) => setCarName(e.target.value)}
            required
            autoFocus
          />
        </fieldset>

        <fieldset>
          <label htmlFor="nickname">Car's Name</label>
          <input
            id="nickname"
            className="form-control"
            type="text"
            value={nickname ?? ''}
            onChange={(e) => setNickname(e.target.value)}
          />
        </fieldset>

        <fieldset>
          <label htmlFor="den">Group</label>
          <input
            id="den"
            className="form-control"
            type="text"
            value={den ?? ''}
            onChange={(e) => setDen(e.target.value)}
          />
        </fieldset>

        <fieldset>
          <label>Status</label>
          <div className="btn-group">
            <button
              type="button"
              className={deferPerm === 0 ? 'btn-primary' : ''}
              onClick={() => setDeferPerm(0)}
            >
              Active
            </button>
            <button
              type="button"
              className={deferPerm === 1 ? 'btn-primary' : ''}
              onClick={() => setDeferPerm(1)}
            >
              Inactive
            </button>
          </div>
        </fieldset>

        <CameraCapture image={image} onCapture={setImage} />

        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          {!isEdit && (
            <button type="button" onClick={() => setShowPicker(true)}>
              Add from mobile check-in… (Ctrl+M)
            </button>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={!valid || submitting}
          >
            {submitting
              ? isEdit
                ? 'Saving…'
                : 'Adding…'
              : isEdit
                ? 'Update'
                : 'Add Car'}
          </button>
        </div>
      </div>

      {!isEdit && eventId !== undefined && (
        <Modal
          open={showPicker}
          onClose={() => setShowPicker(false)}
          className="wide"
        >
          <CheckinPicker
            eventId={eventId}
            onPick={handlePick}
            onClose={() => setShowPicker(false)}
          />
        </Modal>
      )}
    </form>
  )
}
