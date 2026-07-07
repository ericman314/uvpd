// Domain types mirroring the track-server's MySQL schema and API responses.
// Kept deliberately close to the wire shapes the existing backend returns so
// the React app can talk to the unchanged API. Refine as pages are ported.

export type Event = {
  eventId: number
  eventName: string
  eventDate: string // 'YYYY-MM-DD HH:mm:ss'
  multiplier: number
  code?: string | null
  shortUrl?: string | null
  longUrl?: string | null
  // Stored as MySQL BIT(1); the mysql driver returns these as Buffer/number.
  // Narrowed to what the UI needs once we port the toggles.
  enableVoting?: unknown
  hidden?: unknown
}

export type Car = {
  carId: number
  eventId: number
  carName: string
  weight?: number | null
  den?: string | null
  nickname?: string | null
  deferPerm: number
  imageVersion: number
  // GROUP_CONCAT of Achievements.achievement, comma-separated, or null.
  achievements?: string | null
}

export type Result = {
  resultId: number
  carId: number
  eventId: number
  lane: number
  time: number
  place?: number | null
  resultDate: string
}

// Shape returned by GET /api/eventCarsResults and GET /api/car.
export type EventCarsResults = {
  event: Event
  cars: Car[]
  results: Result[]
}