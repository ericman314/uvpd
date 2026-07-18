import { apiGet } from './client'

// Helpers for talking to the public cloud site (utahvalleypinewoodderby.com),
// as opposed to the local track-server. The cloud is a different origin, so
// these fetch against publicSiteUrl directly and carry the shared secret. Both
// the replicator (pushing data up) and the check-in flow (reading pre-registered
// cars down) use these.

// publicSiteUrl comes from the local server; cache the in-flight promise so
// concurrent callers share one fetch.
let publicSiteUrlPromise: Promise<string> | null = null
export function getPublicSiteUrl(): Promise<string> {
  if (!publicSiteUrlPromise) {
    publicSiteUrlPromise = apiGet<{ url: string }>('/publicSiteUrl').then(
      (r) => r.url,
    )
  }
  return publicSiteUrlPromise
}

// The shared secret gating the cloud endpoints; fetched once and cached.
let secretPromise: Promise<string> | null = null
export function getSecret(): Promise<string> {
  if (!secretPromise) {
    secretPromise = apiGet<{ secret: string }>('/api/apiSecret').then(
      (r) => r.secret,
    )
  }
  return secretPromise
}

// POST a JSON body to a cloud endpoint, injecting the secret into the body.
export async function cloudPost(
  path: string,
  body: Record<string, unknown>,
): Promise<void> {
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

// GET a cloud endpoint, injecting the secret into the query string. `params`
// are extra query params (the secret is added automatically).
export async function cloudGet<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const [publicSiteUrl, secret] = await Promise.all([
    getPublicSiteUrl(),
    getSecret(),
  ])
  const query = new URLSearchParams({ ...params, secret })
  const res = await fetch(`${publicSiteUrl}${path}?${query}`)
  if (!res.ok) throw new Error(`cloud ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}
