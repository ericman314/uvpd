import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPost } from '../api/client'
import type { Car, Result } from '../api/types'
import { useConfirm } from '../hooks/useConfirm'
import { ResultsList } from '../components/ResultsList'
import { resultsSorter } from '../utils/helpers'
import './CarDetail.scss'

export function CarDetail() {
  const { carId } = useParams()
  const navigate = useNavigate()

  const [car, setCar] = useState<Car | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [error, setError] = useState<string | null>(null)
  // Cache-buster so the photo isn't a stale cached copy (CarCtrl used
  // ?v=Date.now()). Computed once per mount; will become state when the Edit
  // flow can update the photo in place.
  const [imageVersion] = useState(() => Date.now())
  const { showConfirm, confirmContent } = useConfirm()

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<{ car: Car; results: Result[] }>(
          `/api/car?carId=${carId}`,
        )
        setCar(data.car)
        setResults([...data.results].sort(resultsSorter))
      } catch (e: unknown) {
        setError(String(e))
      }
    })()
  }, [carId])

  const achievements = useMemo(
    () => (car?.achievements ? car.achievements.split(',') : []),
    [car],
  )

  async function deleteResult(result: Result) {
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
    }
  }

  async function deleteCar() {
    if (!car) return
    const ok = await showConfirm({
      title: 'Delete car',
      message: `Delete "${car.carName}"? This cannot be undone.`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await apiPost('/api/carDelete', { carId: car.carId })
      navigate(`/events/${car.eventId}`)
    } catch (e: unknown) {
      setError(String(e))
    }
  }

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>
  if (!car) return <p>Loading…</p>

  return (
    <div className="CarDetail">
      <p>
        <button type="button" className="link-button" onClick={() => navigate(-1)}>
          Back
        </button>
      </p>

      <h1>{car.carName}</h1>

      {/* Edit car (AddCars form modal) not ported yet. */}
      <p>
        <button type="button" className="link-button" disabled>
          Edit car
        </button>
      </p>
      <p>
        <button type="button" className="link-button" onClick={deleteCar}>
          Delete car
        </button>
      </p>

      <img
        className="car-photo"
        src={`/cars/${car.carId}.jpg?v=${imageVersion}`}
        alt={car.carName}
      />

      <p>Achievements: {achievements.join(', ')}</p>

      <ResultsList
        results={results}
        carName={() => car.carName}
        onDelete={deleteResult}
      />

      {confirmContent}
    </div>
  )
}
