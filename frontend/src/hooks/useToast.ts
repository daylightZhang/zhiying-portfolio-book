import { createContext, useContext, useState, useRef, useCallback } from 'react'

interface ToastState {
  message: string
  type: 'success' | 'error'
}

interface ToastContext {
  toast: ToastState | null
  showToast: (message: string, type?: 'success' | 'error') => void
}

export const ToastContext = createContext<ToastContext>({
  toast: null,
  showToast: () => {},
})

export function useToastState() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  return { toast, showToast }
}

export function useToast() {
  return useContext(ToastContext)
}
