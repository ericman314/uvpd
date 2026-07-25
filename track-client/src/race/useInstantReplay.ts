import { useEffect, useRef, useState } from 'react'
import { API_BASE } from '../api/config'
import type { Status } from './useRace'

// Instant replay, ported from the Angular instantReplay directive
// (track-server/public/instantReplay.js). A camera pointed at the finish line
// records each race; when the race ends the recording plays back in a
// slow-motion loop over the race screen.
//
// Angular drove this with five $broadcasts from EventCtrl; all of them are
// derived here from the race `status` transition instead:
//   READY -> RACING   showVideo + startRecording  (gate released)
//   RACING -> ENDED   stopRecording (+400ms), showInstantReplay (+600ms)
//   * -> READY        startVideo + hideVideo       (next race armed)
// The 400/600ms delays are Angular's: they let the last car finish crossing
// before the recorder is cut, then give the blob a moment to assemble.

// Playback of the recorded clip. Angular played every replay at half speed on
// a loop until the next race reset it.
const REPLAY_RATE = 0.5
const REPLAY_LOOP = true

// Capture resolution/rate. High frame rate matters more than resolution here —
// the cars cross the line fast.
const CAPTURE_WIDTH = 1280
const CAPTURE_HEIGHT = 720
const CAPTURE_FRAME_RATE = 60

// Angular's timings between the race ending and the replay appearing.
const STOP_RECORDING_DELAY_MS = 400
const SHOW_REPLAY_DELAY_MS = 600

// Preferred codecs, best first. MediaRecorder is picky and browser-dependent,
// so fall back through these and finally to the browser default.
const MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=h264',
  'video/webm;codecs=vp8',
]

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder.isTypeSupported !== 'function') return undefined
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
}

// Upload the finished clip so it lands in track-server/videos/. The endpoint
// takes a raw base64 data URL as text/plain (not JSON), so this bypasses
// apiPost and calls fetch directly.
async function uploadReplay(blob: Blob) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
  const res = await fetch(`${API_BASE}/api/videoUpload`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: dataUrl,
  })
  if (!res.ok) throw new Error(`videoUpload failed: ${res.status}`)
}

type Replay = {
  // Attach to the overlay's <video> element.
  videoRef: React.RefObject<HTMLVideoElement | null>
  // True once a clip is playing back, so the overlay can go opaque.
  showing: boolean
  // Camera/recorder failure, for an unobtrusive corner note. A dead camera must
  // never take the race screen down with it.
  error: string | null
}

export function useInstantReplay(status: Status): Replay {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showing, setShowing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Latest status, for the async camera-ready path (same ref pattern useRace
  // uses to keep callbacks off stale closures).
  const statusRef = useRef(status)
  statusRef.current = status

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  // Object URL of the clip currently in the <video>, revoked when replaced.
  const clipUrlRef = useRef<string | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Acquire the camera once and keep it for the life of the race screen;
  // getUserMedia is slow enough that per-race acquisition would miss the start.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: CAPTURE_WIDTH,
            height: CAPTURE_HEIGHT,
            frameRate: CAPTURE_FRAME_RATE,
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const mimeType = pickMimeType()
        recorderRef.current = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined,
        )
        recorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data)
        }
        recorderRef.current.onerror = (e) =>
          setError(`Recorder error: ${String(e)}`)
        setError(null)
        showLiveFeed()
        // If the camera was still resolving when the gate went, the status
        // effect found no recorder. Pick the race up mid-flight rather than
        // silently recording nothing.
        if (statusRef.current === 'RACING') {
          chunksRef.current = []
          recorderRef.current.start()
        }
      } catch (e: unknown) {
        if (!cancelled) setError(`Camera unavailable: ${String(e)}`)
      }
    })()

    return () => {
      cancelled = true
      timers.current.forEach(clearTimeout)
      timers.current = []
      const rec = recorderRef.current
      if (rec && rec.state !== 'inactive') {
        // Drop the pending blob — the screen is going away.
        rec.onstop = null
        rec.stop()
      }
      recorderRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
      clipUrlRef.current = null
    }
  }, [])

  // Point the <video> back at the live camera (Angular's startVideo). Also
  // releases the previous clip's object URL.
  function showLiveFeed() {
    const video = videoRef.current
    if (!video) return
    if (clipUrlRef.current) {
      URL.revokeObjectURL(clipUrlRef.current)
      clipUrlRef.current = null
    }
    video.removeAttribute('src')
    video.srcObject = streamRef.current
    video.loop = REPLAY_LOOP
    video.defaultPlaybackRate = REPLAY_RATE
    // The live feed is real-time; only the recorded clip is slowed down.
    video.playbackRate = 1
    // play() rejects with AbortError if the stream is swapped before it
    // resolves — harmless here.
    video.play().catch((e: unknown) => {
      if ((e as Error)?.name !== 'AbortError') {
        setError(`Playback failed: ${String(e)}`)
      }
    })
  }

  // Drive the recorder off status transitions. This is the seam that replaces
  // Angular's $broadcast pairs.
  useEffect(() => {
    const rec = recorderRef.current

    if (status === 'RACING') {
      setShowing(false)
      if (rec && rec.state === 'inactive') {
        chunksRef.current = []
        rec.start()
      }
      return
    }

    if (status === 'ENDED') {
      if (!rec) return
      const stopTimer = setTimeout(() => {
        if (rec.state === 'inactive') return
        rec.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' })
          chunksRef.current = []
          const video = videoRef.current
          if (video) {
            // Detach the live stream first, or the element keeps showing it.
            video.srcObject = null
            const url = URL.createObjectURL(blob)
            clipUrlRef.current = url
            video.src = url
            video.loop = REPLAY_LOOP
            video.playbackRate = REPLAY_RATE
            video.play().catch((e: unknown) => {
              if ((e as Error)?.name !== 'AbortError') {
                setError(`Replay failed: ${String(e)}`)
              }
            })
          }
          uploadReplay(blob).catch((e: unknown) =>
            setError(`Replay upload failed: ${String(e)}`),
          )
        }
        rec.stop()
      }, STOP_RECORDING_DELAY_MS)

      const showTimer = setTimeout(
        () => setShowing(true),
        SHOW_REPLAY_DELAY_MS,
      )
      timers.current.push(stopTimer, showTimer)
      return () => {
        clearTimeout(stopTimer)
        clearTimeout(showTimer)
      }
    }

    // READY: next race armed — hide the overlay and go back to the live feed.
    setShowing(false)
    showLiveFeed()
  }, [status])

  return { videoRef, showing, error }
}
