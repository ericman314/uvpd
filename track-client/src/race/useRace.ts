import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPost } from '../api/client'
import { getSocket } from '../api/socket'
import { replicate } from '../api/replicator'
import type { Car, Event, Result } from '../api/types'
import { resultsSorter } from '../utils/helpers'
import {
  type Assignments,
  initialSchedule,
  moveToNextRun,
  racingCar,
} from './scheduler'

// Race state machine ported from EventCtrl.js. Owns the READY→RACING→ENDED→
// READY cycle, the per-race timing/standings, result persistence, and run
// advancement. The view (Race.tsx) is a pure function of what this returns.
//
// Lanes are 1-based. raceTimes/pinStates are keyed by lane; 0 = not finished,
// 10 = DNF. Deferred to a later pass: achievements, instant replay, defer.

export type Status = 'READY' | 'RACING' | 'ENDED'

const ALL_LANES = [1, 2, 3, 4]
const DNF = 10
const TICK_MS = 52
const RACE_TIMEOUT_MS = 6000
const READY_DWELL_MS = 8000

export type StandingThisRace = {
  car?: Car
  place: number
  name: string
  time: number
  deltaTime: number
  lane: number
}

export type Standing = {
  carName: string
  nickname: string
  time: number
  place: number
  deltaTime: number
}

export function useRace(eventId: string | undefined) {
  const [event, setEvent] = useState<Event | null>(null)
  const [cars, setCars] = useState<Car[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [assignments, setAssignments] = useState<Assignments>({})
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<Status>('READY')
  const [raceTimes, setRaceTimes] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  })
  const [pinStates, setPinStates] = useState<Record<number, number>>({
    1: 1,
    2: 1,
    3: 1,
    4: 1,
  })
  const [standingsThisRace, setStandingsThisRace] = useState<
    StandingThisRace[]
  >([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [serialConnected, setSerialConnected] = useState<boolean | null>(null)

  const lanes = ALL_LANES // lane-disable not ported yet; all four enabled

  // Refs mirror the state the socket/tick callbacks need to read without stale
  // closures (the Angular version read live $scope every tick).
  const statusRef = useRef(status)
  statusRef.current = status
  const gateReleaseTimeRef = useRef(0)
  const raceTimesRef = useRef(raceTimes)
  raceTimesRef.current = raceTimes
  const standingsRef = useRef(standingsThisRace)
  standingsRef.current = standingsThisRace
  const carsRef = useRef(cars)
  carsRef.current = cars
  const resultsRef = useRef(results)
  resultsRef.current = results
  const assignmentsRef = useRef(assignments)
  assignmentsRef.current = assignments
  const eventRef = useRef(event)
  eventRef.current = event

  const arduinoReady = useRef(false)
  const weAreReady = useRef(false)
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load event/cars/results and warm up the schedule (gotoRace's two passes).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiGet<{
          event: Event
          cars: Car[]
          results: Result[]
        }>(`/api/eventCarsResults?eventId=${eventId}`)
        if (cancelled) return
        const sorted = [...data.results].sort(resultsSorter)
        setEvent(data.event)
        setCars(data.cars)
        setResults(sorted)
        setAssignments(
          initialSchedule(data.cars, sorted, data.event, ALL_LANES),
        )
      } catch (e: unknown) {
        if (!cancelled) setError(String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [eventId])

  const getRacingName = useCallback((lane: number): string => {
    const car = racingCar(carsRef.current, assignmentsRef.current, lane)
    return car ? car.carName : 'Unassigned'
  }, [])

  // Persist one result (EventCtrl.saveResult): optimistic local append + POST +
  // replicate. resultDate is the gate-release time, matching the Angular app.
  const saveResult = useCallback(
    (car: Car, lane: number, time: number, place: number, date: Date) => {
      const newResult = {
        carId: car.carId,
        eventId: eventRef.current!.eventId,
        lane,
        time,
        place,
        resultDate: date.toISOString(),
      }
      setResults((prev) => [...prev, newResult as Result].sort(resultsSorter))
      apiPost('/api/result', newResult)
        .then(() => replicate(eventRef.current!.eventId))
        .catch((e) => setError(String(e)))
    },
    [],
  )

  // Compute the cumulative event leaderboard (EventCtrl.computeStandings), top
  // 12 by best time. No stagger animation — rendered all at once.
  const computeStandings = useCallback(() => {
    const rows: Standing[] = []
    for (const car of carsRef.current) {
      const times = resultsRef.current
        .filter((r) => r.carId === car.carId)
        .map((r) => r.time)
      if (!times.length) continue
      rows.push({
        carName: car.carName,
        nickname: car.nickname ? ' ' + car.nickname : '',
        time: Math.min(...times),
        place: 0,
        deltaTime: 0,
      })
    }
    rows.sort((a, b) => a.time - b.time)
    const best = rows.length ? rows[0].time : 0
    rows.forEach((r, i) => {
      r.place = i + 1
      r.deltaTime = r.time - best
    })
    setStandings(rows.slice(0, 12))
  }, [])

  // DNF fill (EventCtrl.addDnfResults): any enabled lane with raceTime 0 at the
  // end gets a DNF (time 10). All DNF cars share one place.
  const addDnfResults = useCallback(() => {
    const place = standingsRef.current.length + 1
    const date = new Date(gateReleaseTimeRef.current)
    const dnfLanes = lanes.filter((l) => raceTimesRef.current[l] === 0)
    const additions: StandingThisRace[] = []
    for (const lane of dnfLanes) {
      const car = racingCar(carsRef.current, assignmentsRef.current, lane)
      if (car) saveResult(car, lane, DNF, place, date)
      additions.push({
        car,
        place,
        name: getRacingName(lane),
        time: DNF,
        deltaTime: 0,
        lane,
      })
    }
    if (dnfLanes.length) {
      setRaceTimes((prev) => {
        const next = { ...prev }
        dnfLanes.forEach((l) => (next[l] = DNF))
        return next
      })
      setStandingsThisRace((prev) => [...prev, ...additions])
    }
  }, [lanes, saveResult, getRacingName])

  const stopRace = useCallback(() => {
    if (statusRef.current !== 'RACING') return
    setStatus('ENDED')
    statusRef.current = 'ENDED'
    addDnfResults()
    computeStandings()
    // Minimum dwell before the ENDED screen may auto-advance.
    weAreReady.current = false
    dwellTimer.current = setTimeout(() => {
      weAreReady.current = true
    }, READY_DWELL_MS)
  }, [addDnfResults, computeStandings])

  // Advance to the next race (EventCtrl.readyForStart): reset per-race state and
  // roll the schedule forward.
  const readyForStart = useCallback(() => {
    setStatus('READY')
    statusRef.current = 'READY'
    setAssignments((prev) =>
      moveToNextRun(
        carsRef.current,
        resultsRef.current,
        eventRef.current!,
        lanes,
        prev,
      ),
    )
    setRaceTimes({ 1: 0, 2: 0, 3: 0, 4: 0 })
    setStandingsThisRace([])
    setStandings([])
  }, [lanes])

  // The 52ms loop, running only while RACING/ENDED (EventCtrl.tick).
  const tick = useCallback(() => {
    setCurrentTime(Date.now())
    const s = statusRef.current
    if (s === 'RACING') {
      const elapsed = Date.now() - gateReleaseTimeRef.current
      const allDone = standingsRef.current.length === lanes.length
      if (elapsed > RACE_TIMEOUT_MS || allDone) {
        stopRace()
      }
    } else if (s === 'ENDED') {
      if (arduinoReady.current && weAreReady.current) {
        readyForStart()
      }
    }
    if (statusRef.current === 'RACING' || statusRef.current === 'ENDED') {
      tickTimer.current = setTimeout(tick, TICK_MS)
    } else {
      tickTimer.current = null
    }
  }, [lanes, stopRace, readyForStart])

  // Socket wiring: the live race feed. Registered once; handlers read refs.
  useEffect(() => {
    const socket = getSocket()

    const onGate = () => {
      if (statusRef.current !== 'READY') return
      gateReleaseTimeRef.current = Date.now()
      setStatus('RACING')
      statusRef.current = 'RACING'
      arduinoReady.current = false
      weAreReady.current = false
      if (tickTimer.current === null) tick()
    }

    const onTrigger = (data: {
      lane: number
      time: number
      softwareTime: number
    }) => {
      if (!lanes.includes(data.lane)) return
      if (statusRef.current !== 'RACING') return
      if (raceTimesRef.current[data.lane] !== 0) return // dedup per lane
      const place = standingsRef.current.length + 1
      setRaceTimes((prev) => ({ ...prev, [data.lane]: data.time }))
      const car = racingCar(carsRef.current, assignmentsRef.current, data.lane)
      if (car) {
        saveResult(
          car,
          data.lane,
          data.time,
          place,
          new Date(gateReleaseTimeRef.current),
        )
      }
      setStandingsThisRace((prev) => [
        ...prev,
        {
          car,
          place,
          name: getRacingName(data.lane),
          time: data.time,
          deltaTime: prev.length > 0 ? data.time - prev[0].time : 0,
          lane: data.lane,
        },
      ])
    }

    const onReady = () => {
      arduinoReady.current = true
    }
    const onPin = (data: { lane: number; state: number }) =>
      setPinStates((prev) => ({ ...prev, [data.lane]: data.state }))
    const onSerial = (data: { connected: boolean }) =>
      setSerialConnected(data.connected)

    socket.on('startingGateReleased', onGate)
    socket.on('trigger', onTrigger)
    socket.on('readyForStart', onReady)
    socket.on('pinStateChange', onPin)
    socket.on('serialState', onSerial)
    return () => {
      socket.off('startingGateReleased', onGate)
      socket.off('trigger', onTrigger)
      socket.off('readyForStart', onReady)
      socket.off('pinStateChange', onPin)
      socket.off('serialState', onSerial)
    }
  }, [lanes, tick, saveResult, getRacingName])

  // Cleanup timers on unmount.
  useEffect(
    () => () => {
      if (tickTimer.current) clearTimeout(tickTimer.current)
      if (dwellTimer.current) clearTimeout(dwellTimer.current)
    },
    [],
  )

  // getPlace(lane): 1-based place among finished enabled lanes, '' if unfinished.
  const getPlace = useCallback(
    (lane: number): number | '' => {
      const mine = raceTimes[lane]
      if (!mine) return ''
      let place = 1
      for (const l of lanes) {
        if (l !== lane && raceTimes[l] && raceTimes[l] < mine) place++
      }
      return place
    },
    [raceTimes, lanes],
  )

  const liveClock = useMemo(
    () =>
      status !== 'READY'
        ? (currentTime - gateReleaseTimeRef.current) / 1000
        : 0,
    [status, currentTime],
  )

  return {
    event,
    cars,
    assignments,
    error,
    status,
    lanes,
    allLanes: ALL_LANES,
    raceTimes,
    pinStates,
    standingsThisRace,
    standings,
    serialConnected,
    liveClock,
    getPlace,
    getRacingName,
  }
}
