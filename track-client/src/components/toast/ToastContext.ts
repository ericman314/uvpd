import { createContext } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export type Toast = {
  id: number
  message: string
  kind: ToastKind
}

// Fire a toast from anywhere under <ToastProvider>. Returns the toast id so a
// caller can dismiss it early if needed.
export type ShowToast = (message: string, kind?: ToastKind) => number

export const ToastContext = createContext<ShowToast | null>(null)
