import { DateTime } from 'luxon'
import type { Result } from '../api/types'
import { formatTime } from '../utils/helpers'
import './ResultsList.scss'

type PropType = {
  results: Result[]
  // Resolve the display name for a result's car. On the event page this looks
  // the car up; on the car page it's always that one car's name.
  carName: (result: Result) => string | undefined
  onDelete: (result: Result) => void
}

// Shared results list used by the event and car pages: one row per result with
// timestamp + car name, a right-aligned lane-colored time, and a delete button.
export function ResultsList({ results, carName, onDelete }: PropType) {
  return (
    <div className="ResultsList">
      <ul>
        {results.map((result) => (
          <li key={result.resultId} className="result-item">
            <div className="result-name">
              {DateTime.fromISO(result.resultDate).toFormat('h:mm:ss a')}{' '}
              {carName(result)}
            </div>
            <div className={`result-time lane-color-${result.lane}`}>
              {formatTime(result.time)}
            </div>
            <button
              type="button"
              className="result-delete"
              onClick={() => onDelete(result)}
              title="Delete result"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
