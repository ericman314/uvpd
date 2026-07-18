import { cloudGet, cloudPost, getPublicSiteUrl } from './cloud'
import type { Checkin } from './types'

// Mobile check-in: cars parents pre-register online live in the cloud CheckIn
// table. The picker reads them down; adding one marks it so it drops off the
// unadded list. All of this talks to the cloud (publicSiteUrl), not the local
// track-server.

type CheckinFilters = {
  eventId: number
  showAllEvents: boolean
  showAddedCars: boolean
}

// Fetch the cloud check-in list. recent=1 limits to the last few days; the
// filters map to eventId / notAdded query params, matching the Angular flow.
export async function fetchCheckinList(
  filters: CheckinFilters,
): Promise<Checkin[]> {
  const params: Record<string, string> = { recent: '1' }
  if (!filters.showAllEvents) params.eventId = String(filters.eventId)
  if (!filters.showAddedCars) params.notAdded = '1'
  const data = await cloudGet<Checkin[] | { err: unknown }>(
    '/api/v3/checkinlist',
    params,
  )
  if (!Array.isArray(data)) throw new Error(String(data?.err ?? 'Invalid data'))
  return data
}

// The cloud URL for a check-in's photo (used as an <img> preview src).
export async function checkinImageUrl(checkInId: string): Promise<string> {
  const publicSiteUrl = await getPublicSiteUrl()
  return `${publicSiteUrl}/api/v3/checkin/${checkInId}.jpg`
}

// Fetch a check-in photo and convert it to a JPEG data URL — the React
// equivalent of the Angular onImgLoad canvas trick, so the checkin photo
// becomes real imageData that saves with the car and syncs to the cloud.
export async function checkinImageAsDataUrl(checkInId: string): Promise<string> {
  const url = await checkinImageUrl(checkInId)
  const blob = await fetch(url).then((r) => r.blob())
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read checkin image'))
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

// Tell the cloud a check-in has been added to an event (drops it off the
// unadded list).
export function markCheckinAdded(
  checkInId: string,
  eventId: number,
): Promise<void> {
  return cloudPost('/api/v3/checkinadded', { checkInId, eventId })
}
