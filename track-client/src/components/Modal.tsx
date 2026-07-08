import { useEffect, useRef } from 'react'
import './Modal.scss'

type PropType = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  // Extra class on the <dialog> for size/variant modifiers (e.g. 'wide').
  className?: string
}

// Reusable modal built on the native <dialog> element: free backdrop,
// Esc-to-close, and focus trapping. `open` drives showModal()/close(); closing
// by any means (Esc, backdrop click, close button) calls onClose.
export function Modal({ open, onClose, children, className }: PropType) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Backdrop clicks land on the <dialog> itself (children sit in an inner div),
  // so a click whose target is the dialog means "clicked outside the content".
  function onClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={className ? `modal ${className}` : 'modal'}
      onClose={onClose}
      onClick={onClick}
    >
      <div className="modal-content">{children}</div>
    </dialog>
  )
}
