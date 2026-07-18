import { apiGet } from './client'

// Replicates local track-server data up to the public cloud site — the React
// equivalent of the Angular dbReplicator service. It's a plain module singleton
// (not a hook): the debounce queue and cached publicSiteUrl are app-global.
//
// Flow: GET /mysqldump (local) returns { output, secret }; POST that to
// {publicSiteUrl}/api/v3/mysqldump. Car photos go to /api/v3/carImage. The
// cloud endpoints are a different origin than the local server, so they're
// fetched against publicSiteUrl directly rather than the API_BASE seam.

type MysqldumpResponse = { output: string; secret: string; err?: unknown }

// publicSiteUrl comes from the local server; cache the in-flight promise so
// concurrent callers share one fetch.
let publicSiteUrlPromise: Promise<string> | null = null
function getPublicSiteUrl(): Promise<string> {
  if (!publicSiteUrlPromise) {
    publicSiteUrlPromise = apiGet<{ url: string }>('/publicSiteUrl').then(
      (r) => r.url,
    )
  }
  return publicSiteUrlPromise
}

// The shared secret gating the cloud endpoints; fetched once from the local
// server and cached.
let secretPromise: Promise<string> | null = null
function getSecret(): Promise<string> {
  if (!secretPromise) {
    secretPromise = apiGet<{ secret: string }>('/api/apiSecret').then(
      (r) => r.secret,
    )
  }
  return secretPromise
}

// POST a JSON body to a cloud (publicSiteUrl) endpoint, injecting the secret.
async function cloudPost(path: string, body: Record<string, unknown>): Promise<void> {
  const [publicSiteUrl, secret] = await Promise.all([
    getPublicSiteUrl(),
    getSecret(),
  ])
  const res = await fetch(`${publicSiteUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, secret }),
  })
  if (!res.ok) throw new Error(`cloud ${path} failed: ${res.status}`)
}

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
