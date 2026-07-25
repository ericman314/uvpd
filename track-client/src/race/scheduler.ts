import type { Car, Event, Result } from '../api/types'

// Deterministic run scheduler, ported from EventCtrl.moveToNextRun
// (track-server/public/EventCtrl.js:530). No React, no mutation of app data —
// the per-race assignment (which car is racing / on deck in which lane) lives in
// this Assignment map, keyed by carId, rather than on the Car objects the way
// the Angular controller mutated them in place.
//
// Lanes are 1-based (1..4). Lane 0 is the "unassigned" sentinel.

export type Assignment = {
  // Lane this car occupies in the current race (0 = not racing).
  racingLane: number
  // Lane this car will occupy in the next race (0 = not on deck).
  onDeckLane: number
}

export type Assignments = Record<number, Assignment>

const NONE = 0

export function emptyAssignment(): Assignment {
  return { racingLane: NONE, onDeckLane: NONE }
}

function get(assignments: Assignments, carId: number): Assignment {
  return assignments[carId] ?? emptyAssignment()
}

function resultsByCar(results: Result[], carId: number): Result[] {
  return results.filter((r) => r.carId === carId)
}

// Advance the schedule one race: promote on-deck → racing, then pick the next
// on-deck car per enabled lane by the deterministic score below. Returns a NEW
// Assignments map (callers hold it in state); deferPerm is read from the Car.
// Mirrors EventCtrl.moveToNextRun exactly, including the score weights.
export function moveToNextRun(
  cars: Car[],
  results: Result[],
  event: Pick<Event, 'multiplier'>,
  lanes: number[],
  prev: Assignments,
): Assignments {
  // Phase A — promote on-deck to racing, clear on-deck.
  const next: Assignments = {}
  for (const car of cars) {
    const a = get(prev, car.carId)
    next[car.carId] = { racingLane: a.onDeckLane, onDeckLane: NONE }
  }

  // Phase B — pick next on-deck per lane. Deterministic so the order survives a
  // page refresh (the whole reason the Angular version scored instead of
  // shuffling).
  for (const lane of lanes) {
    let bestScore: number | null = null
    let bestCar: Car | null = null

    for (const car of cars) {
      const rs = resultsByCar(results, car.carId)
      const a = next[car.carId]
      const racing = a.racingLane ? 1 : 0
      let score = 0

      // Run once on each lane before twice on any, etc.
      const onThisLane = rs.filter((e) => e.lane === lane).length
      if (onThisLane * lanes.length > rs.length + racing) score += 1e12

      // Already run its full count (including the currently scheduled race)?
      if (rs.length + racing >= event.multiplier) score += 1e12

      score += rs.length * 1e4 // fewer total races preferred
      score += onThisLane * 1e5 // spread across lanes

      if (a.racingLane === lane) score += 1e12 // racing this lane now
      if (a.racingLane) score += 1e4 // racing any lane now
      if (a.onDeckLane) score += 1e12 // already scheduled next
      if (car.deferPerm) score += 1e12 // permanently deferred

      // Slight tie-break toward faster cars.
      const times = rs.map((e) => e.time)
      if (times.length) score -= Math.min(...times)

      // The 9e11 threshold excludes any car that hit a 1e12 hard penalty.
      if (score < 9e11 && (bestScore === null || score < bestScore)) {
        bestScore = score
        bestCar = car
      }
    }

    if (bestCar) next[bestCar.carId].onDeckLane = lane
  }

  return next
}

// Warm-up from an empty schedule: two passes, as gotoRace does
// (EventCtrl.js:346) — the first fills on-deck, the second promotes it to
// racing and fills the new on-deck.
export function initialSchedule(
  cars: Car[],
  results: Result[],
  event: Pick<Event, 'multiplier'>,
  lanes: number[],
): Assignments {
  let a: Assignments = {}
  a = moveToNextRun(cars, results, event, lanes, a)
  a = moveToNextRun(cars, results, event, lanes, a)
  return a
}

// Lookups mirroring getRacing / getOnDeck (EventCtrl.js:617 / 609).
export function racingCar(
  cars: Car[],
  assignments: Assignments,
  lane: number,
): Car | undefined {
  return cars.find((c) => get(assignments, c.carId).racingLane === lane)
}

export function onDeckCar(
  cars: Car[],
  assignments: Assignments,
  lane: number,
): Car | undefined {
  return cars.find((c) => get(assignments, c.carId).onDeckLane === lane)
}
