import { DateTime } from 'luxon'
import type { Result } from '../api/types'

// Shared helpers used across pages. Result helpers below were ported from the
// Angular controllers (EventCtrl/CarCtrl both defined these identically).

// Sort newest first, tie-broken by lane.
export function resultsSorter(a: Result, b: Result): number {
  const aTime = DateTime.fromISO(a.resultDate).toMillis() - a.lane
  const bTime = DateTime.fromISO(b.resultDate).toMillis() - b.lane
  if (aTime < bTime) return 1
  if (aTime > bTime) return -1
  return 0
}

// Format a result time; sentinel 10 means "did not finish".
export function formatTime(time: number): string {
  return time === 10 ? 'DNF' : time.toFixed(4)
}
