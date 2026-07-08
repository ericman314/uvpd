import { useEffect, useRef, useState } from 'react'
import './CameraCapture.scss'

type PropType = {
  // Called with a JPEG data URL whenever a picture is taken or rotated.
  onCapture: (dataUrl: string) => void
  // Current captured image (data URL), or null if none yet.
  image: string | null
}

// Live webcam capture, ported from the Angular videoStream directive +
// AddCarsCtrl's take/rotate logic. Shows a live preview and the captured still
// side by side; "Take Picture" grabs the current frame, rotate buttons redraw
// the captured image through a rotated canvas. The MediaStream is stopped on
// unmount. Scale weight and mobile-checkin are intentionally not included.
export function CameraCapture({ onCapture, image }: PropType) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    // In React StrictMode the effect runs twice (mount/unmount/remount); this
    // flag lets a late-resolving getUserMedia from a cleaned-up pass bail out
    // instead of clobbering the live stream.
    let cancelled = false
    ;(async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        })
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // play() rejects with AbortError if the stream is swapped/stopped
          // before it resolves (normal during StrictMode remount) — ignore it.
          try {
            await videoRef.current.play()
            if (!cancelled) setError(null)
          } catch (e: unknown) {
            if ((e as Error)?.name !== 'AbortError') throw e
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setError(`Camera unavailable: ${String(e)}`)
      }
    })()

    // Stop the camera when the component unmounts (Angular did this on $destroy).
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function takePicture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    onCapture(canvas.toDataURL('image/jpeg'))
  }

  function rotate(angle: number) {
    if (!image) return
    const img = new Image()
    // The seeded edit-mode image is a same-origin /cars/*.jpg URL; set
    // crossOrigin so the canvas isn't tainted when we read it back.
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      // A quarter turn swaps width/height, so on a non-square image we zoom to
      // fill the (unchanged) canvas — this crops, unavoidable at a fixed size.
      // A 180° turn keeps dimensions, so it fits 1:1 with no zoom/crop.
      const isQuarterTurn = Math.abs(angle) % 180 === 90
      const factor = isQuarterTurn
        ? Math.max(canvas.width / canvas.height, canvas.height / canvas.width)
        : 1
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.scale(factor, factor)
      ctx.rotate((angle * Math.PI) / 180)
      ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2)
      onCapture(canvas.toDataURL('image/jpeg'))
    }
    img.src = image
  }

  return (
    <div className="CameraCapture">
      {error && <p className="camera-error">{error}</p>}

      <div className="camera-row">
        <div className="camera-cell">
          {/* muted+playsInline so autoplay works without user gesture. */}
          <video ref={videoRef} muted playsInline>
            Video stream not available.
          </video>
        </div>
        <div className="camera-cell">
          {image ? (
            <img src={image} alt="Captured car" />
          ) : (
            <div className="camera-placeholder">No picture yet</div>
          )}
        </div>
      </div>

      <div className="camera-controls">
        <button type="button" onClick={takePicture}>
          Take Picture
        </button>
        <button type="button" onClick={() => rotate(-90)} disabled={!image}>
          Rotate 90 CCW
        </button>
        <button type="button" onClick={() => rotate(180)} disabled={!image}>
          Rotate 180
        </button>
        <button type="button" onClick={() => rotate(90)} disabled={!image}>
          Rotate 90 CW
        </button>
      </div>
    </div>
  )
}
