import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRace } from '../race/useRace'
import { onDeckCar, racingCar } from '../race/scheduler'
import type { Car } from '../api/types'
import { formatTime } from '../utils/helpers'
import './Race.scss'

// Car photo, or the shared placeholder for an unassigned lane.
function carImage(car: Car | undefined): string {
  return car ? `/cars/${car.carId}.jpg` : '/img/none.jpg'
}

// Race display screen, ported from race.html. A full-screen projector view:
// NOW RACING lanes with live count-up timers, per-lane final time/place, an
// ENDED standings list, and the ON DECK preview. The collapse/fade motion is
// CSS-driven (class toggles keyed off status); see Race.scss.
//
// Out of this first pass (clean seams left): achievements, instant replay, and
// the defer dropdown.

// Standings fly-in schedule (EventCtrl.computeStandings $timeout): the first row
// appears 8s after the race ends, then one every 100ms.
const STANDINGS_LEAD_S = 8
const STANDINGS_STEP_S = 0.1

// Unfinished lanes start fading their countdown at 5s so the 1s fade completes
// right as the race stops at 6s (rather than trying to fade at the instant the
// element would otherwise unmount).
const FADE_START_S = 5

// Duration of the NOW RACING collapse transition; must match the CSS transition
// on .now-racing. After this, the band switches to overflow:visible so the place
// badge can hang below its edge.
const COLLAPSE_MS = 300

export function Race() {
  const { eventId } = useParams()
  const race = useRace(eventId)
  const {
    cars,
    assignments,
    status,
    lanes,
    allLanes,
    raceTimes,
    pinStates,
    standings,
    serialConnected,
    liveClock,
    getPlace,
    getRacingName,
    error,
  } = race

  const collapsed = status === 'RACING' || status === 'ENDED'

  // The band clips overflow (overflow:hidden) while it's moving, so car images
  // are cut at the collapsing edge. Once the collapse settles we switch to
  // overflow:visible so the place badge can hang below the band; on the way back
  // (expanding) we clip again immediately, before the band grows.
  const [bandOverflowVisible, setBandOverflowVisible] = useState(false)
  useEffect(() => {
    if (collapsed) {
      const t = setTimeout(() => setBandOverflowVisible(true), COLLAPSE_MS)
      return () => clearTimeout(t)
    }
    setBandOverflowVisible(false)
  }, [collapsed])

  if (error) return <div className="Race error">{error}</div>

  const laneEnabled = (lane: number) => lanes.indexOf(lane) >= 0

  return (
    <div className="Race fullpage-wrapper">
      <div className="fullpage">
        {/* NOW RACING */}
        <div
          className={`now-racing${collapsed ? ' collapse-now-racing' : ''}${
            bandOverflowVisible ? ' overflow-visible' : ''
          }`}
        >
          <h1>NOW RACING</h1>
          <div className="lane-row">
            {allLanes.map((lane) => {
              const car = racingCar(cars, assignments, lane)
              const show = car || laneEnabled(lane)
              const time = raceTimes[lane]
              const place = getPlace(lane)
              return (
                <div key={lane} className="now-racing-section">
                  {pinStates[lane] === 0 && (
                    <div className="pinStateWarning">!</div>
                  )}
                  {show && (
                    <>
                      <div className="name">
                        <h2>{getRacingName(lane)}</h2>
                        <h3>{car?.nickname || ' '}</h3>
                      </div>

                      {collapsed && time === 0 && (
                        <div
                          className={`time-countdown${
                            liveClock >= FADE_START_S
                              ? ' time-countdown-fade'
                              : ''
                          }`}
                        >
                          {formatTime(liveClock)}
                        </div>
                      )}
                      {collapsed && time !== 0 && time !== 10 && (
                        <div
                          className={`time-final${
                            place === 1 ? ' time-final-winner' : ''
                          }`}
                        >
                          {formatTime(time)}
                        </div>
                      )}

                      {collapsed && time !== 0 && (
                        <div className="result-place-wrapper">
                          <div
                            className={`result-place${
                              place !== '' ? ' result-place-show' : ''
                            }`}
                          >
                            {place}
                          </div>
                        </div>
                      )}

                      <div className="now-racing-section-image">
                        <img src={carImage(car)} alt={getRacingName(lane)} />
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ON DECK */}
        <div className="on-deck">
          <h1>ON DECK</h1>
          <div className="lane-row">
            {allLanes.map((lane) => {
              const car = onDeckCar(cars, assignments, lane)
              const show = car || laneEnabled(lane)
              return (
                <div key={lane} className="on-deck-section">
                  {show && (
                    <>
                      <div className="name">
                        <h2>{car ? car.carName : 'Unassigned'}</h2>
                      </div>
                      <div>
                        <img
                          src={carImage(car)}
                          alt={car ? car.carName : 'Unassigned'}
                        />
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Instant-replay overlay. For now just a black fade — the video feed
            is deferred. Shown (faded in) whenever a race is in progress or just
            ended, matching Angular's showVideo/hideVideo broadcasts. */}
        <div
          className={`instant-replay${status !== 'READY' ? ' shown' : ''}`}
        />

        {/* CURRENT STANDINGS (ENDED only) */}
        {status === 'ENDED' && standings.length > 0 && (
          <div className="current-standings">
            {standings.map((s, i) => (
              <div
                key={s.place}
                className="standing-wrapper"
                style={{
                  animationDelay: `${STANDINGS_LEAD_S + i * STANDINGS_STEP_S}s`,
                }}
              >
                <div className="standing-place">{s.place}</div>
                <div className="standing-name">
                  <span>{s.carName}</span>
                  <span className="standing-nickname">{s.nickname}</span>
                </div>
                <div className="standing-time">
                  {formatTime(s.time)}{' '}
                  {s.deltaTime > 0 && s.deltaTime < 4 && (
                    <span>(+{s.deltaTime.toFixed(4)})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Up next (ENDED only) */}
        {status === 'ENDED' && (
          <div className="racing-next">
            <h2>
              Up next:{' '}
              {allLanes.map((lane, i) => {
                const car = onDeckCar(cars, assignments, lane)
                return (
                  <span key={lane}>
                    <span className={`lane-color-${lane}`}>
                      {car ? car.carName : 'Unassigned'}
                    </span>
                    {i < allLanes.length - 1 ? ', ' : ''}
                  </span>
                )
              })}
            </h2>
          </div>
        )}

        {serialConnected === false && (
          <div className="serial-warning">Track not connected</div>
        )}
      </div>
    </div>
  )
}
