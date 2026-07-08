import { useMemo, useState } from 'react'
import { apiPost } from '../api/client'
import type { Car } from '../api/types'
import { CameraCapture } from '../components/CameraCapture'

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
// Fields: name/nickname/den/status + webcam photo. Add -> /api/newCarSave,
// edit -> /api/carUpdate. Scale weight and "add from mobile checkin" deferred.
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
      if (isEdit) {
        await apiPost('/api/carUpdate', {
          carId: car.carId,
          carName,
          nickname,
          den,
          deferPerm,
          ...(newImageData ? { imageData: newImageData } : {}),
        })
        onSaved(car.carId)
      } else {
        const res = await apiPost<{ result: { insertId: number } }>(
          '/api/newCarSave',
          {
            eventId,
            car: { carName, nickname, den, deferPerm, imageData: newImageData },
          },
        )
        onSaved(res.result.insertId)
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
          <label htmlFor="den">Den</label>
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
    </form>
  )
}
