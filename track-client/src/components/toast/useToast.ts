import { useContext } from 'react'
import { ToastContext } from './ToastContext'

// Access the app-global toast function. Must be used under <ToastProvider>.
export function useToast() {
  const showToast = useContext(ToastContext)
  if (!showToast) throw new Error('useToast must be used within a ToastProvider')
  return showToast
}
