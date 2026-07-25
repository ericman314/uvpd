import { apiGet } from './client'
import { getPublicSiteUrl, cloudPost } from './cloud'

// Replicates local track-server data up to the public cloud site — the React
// equivalent of the Angular dbReplicator service. It's a plain module singleton
// (not a hook): the debounce queue is app-global. Shared cloud plumbing
// (publicSiteUrl, secret, cloudPost) lives in ./cloud.
//
// Flow: GET /mysqldump (local) returns { output, secret }; POST that to
// {publicSiteUrl}/api/v3/mysqldump. Car photos go to /api/v3/carImage.

type MysqldumpResponse = { output: string; secret: string; err?: unknown }

// Debounced queue of eventIds to replicate. undefined = whole DB.
let queue: (number | undefined)[] = []
let timer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 2000

async function processOne(eventId: number | undefined): Promise<void> {
  const path =
    eventId === undefined ? '/mysqldump' : `/mysqldump?eventId=${eventId}`
  const dump = await apiGet<MysqldumpResponse>(path)
  if (dump.err) throw new Error(String(dump.err))

  const publicSiteUrl = await getPublicSiteUrl()
  const res = await fetch(`${publicSiteUrl}/api/v3/mysqldump`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: dump.output, secret: dump.secret }),
  })
  if (!res.ok) throw new Error(`cloud mysqldump failed: ${res.status}`)
}

async function processQueue(): Promise<void> {
  const pending = queue
  queue = []
  timer = null
  for (const eventId of pending) {
    try {
      await processOne(eventId)
    } catch (e: unknown) {
      console.error('replicate failed for event', eventId, e)
    }
  }
}

// Queue a replication of one event (or the whole DB if eventId is omitted).
// Debounced 2s and deduped, matching the Angular dbReplicator.
export function replicate(eventId?: number): void {
  if (!queue.includes(eventId)) queue.push(eventId)
  if (!timer) timer = setTimeout(processQueue, DEBOUNCE_MS)
}

// Immediate, awaitable whole-DB replicate for the explicit "Replicate DB"
// button — bypasses the debounce so the caller can show success/failure.
export function replicateNow(): Promise<void> {
  return processOne(undefined)
}

// Push a car photo (JPEG data URL) to the cloud. Secret comes from the caller
// (e.g. the /newCarSave or /carUpdate response), as in the Angular version.
export async function sendImage(
  carId: number,
  imageData: string,
  secret: string,
): Promise<void> {
  const publicSiteUrl = await getPublicSiteUrl()
  const res = await fetch(`${publicSiteUrl}/api/v3/carImage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Id: carId, imageData, secret }),
  })
  if (!res.ok) throw new Error(`cloud carImage failed: ${res.status}`)
}

// Propagate deletes to the cloud (REPLACE-based replication can't express them).
// The cloud endpoints cascade server-side, so callers just name the id.
export function replicateResultDelete(resultId: number): Promise<void> {
  return cloudPost('/api/v3/resultDelete', { resultId })
}

export function replicateCarDelete(carId: number): Promise<void> {
  return cloudPost('/api/v3/carDelete', { carId })
}

export function replicateEventDelete(eventId: number): Promise<void> {
  return cloudPost('/api/v3/eventDelete', { eventId })
}

export function replicateEventDeleteResults(eventId: number): Promise<void> {
  return cloudPost('/api/v3/eventDeleteResults', { eventId })
}
