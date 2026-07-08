import { useCallback, useRef, useState } from 'react'
import { Modal } from '../components/Modal'

type ConfirmOptions = {
  title?: string
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
}

const DEFAULTS: Required<Omit<ConfirmOptions, 'message'>> & {
  message: React.ReactNode
} = {
  title: 'Confirm',
  message: 'Are you sure?',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
}

// Modal confirmation dialog as a hook. Replaces window.confirm() with the
// app's Modal. showConfirm(options) returns a Promise<boolean> so callers can
// `if (await showConfirm({ message: '...' })) { ... }`.
export function useConfirm() {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({})
  // Holds the current promise's resolver between showConfirm() and the
  // button click that settles it.
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const showConfirm = useCallback((options?: ConfirmOptions) => {
    setOptions(options ?? {})
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = useCallback((value: boolean) => {
    setOpen(false)
    resolverRef.current?.(value)
    resolverRef.current = null
  }, [])

  const opts = { ...DEFAULTS, ...options }

  const confirmContent = (
    // Closing by Esc / backdrop counts as cancel.
    <Modal open={open} onClose={() => settle(false)}>
      <h2>{opts.title}</h2>
      <div className="modal-body">
        <p>{opts.message}</p>
        <div className="modal-footer">
          <button type="button" onClick={() => settle(false)}>
            {opts.cancelLabel}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => settle(true)}
          >
            {opts.confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )

  return { showConfirm, confirmContent }
}
