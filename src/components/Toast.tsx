import { useEffect, useState } from 'react'
import { X, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

export type ToastType = 'error' | 'success' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message: string
  showRefresh?: boolean
}

interface ToastProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
  onRefresh?: () => void
}

export function ToastContainer({ toasts, onDismiss, onRefresh }: ToastProps) {
  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} onRefresh={onRefresh} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss, onRefresh }: {
  toast: Toast
  onDismiss: (id: string) => void
  onRefresh?: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true))
    // Auto dismiss after 6s
    const t = setTimeout(() => dismiss(), 6000)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    setLeaving(true)
    setTimeout(() => onDismiss(toast.id), 350)
  }

  const isError   = toast.type === 'error'
  const isSuccess = toast.type === 'success'

  return (
    <div
      className={`
        relative overflow-hidden border rounded-sm shadow-lg
        transition-all duration-350 ease-out
        ${visible && !leaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
        ${isError   ? 'bg-white border-red-200'   : ''}
        ${isSuccess ? 'bg-white border-teal/30'   : ''}
        ${!isError && !isSuccess ? 'bg-white border-neutral-200' : ''}
      `}
    >
      {/* Top color bar */}
      <div className={`h-0.5 w-full ${isError ? 'bg-red-500' : isSuccess ? 'bg-teal' : 'bg-neutral-400'}`} />

      <div className="p-4 flex gap-3">
        {/* Icon */}
        <div className="shrink-0 mt-0.5">
          {isError   && <AlertCircle  className="h-4 w-4 text-red-500" />}
          {isSuccess && <CheckCircle  className="h-4 w-4 text-teal"    />}
          {!isError && !isSuccess && <AlertCircle className="h-4 w-4 text-neutral-400" />}
        </div>

        <div className="flex-1 space-y-1 min-w-0">
          <p className="text-xs font-bold text-black">{toast.title}</p>
          <p className="text-xs text-neutral-500 leading-relaxed">{toast.message}</p>

          {/* Data protection line — always shown on errors */}
          {isError && (
            <p className="text-[10px] text-neutral-400 flex items-center gap-1 pt-1">
              🔒 Your data is protected. We've got you covered.
            </p>
          )}

          {/* Refresh button */}
          {toast.showRefresh && onRefresh && (
            <button
              onClick={() => { onRefresh(); dismiss() }}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-black border border-neutral-200 px-2.5 py-1 hover:bg-neutral-50 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Try again
            </button>
          )}
        </div>

        {/* Dismiss */}
        <button onClick={dismiss} className="shrink-0 text-neutral-300 hover:text-black transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className={`h-0.5 ${isError ? 'bg-red-100' : 'bg-neutral-100'}`}>
        <div
          className={`h-full ${isError ? 'bg-red-300' : 'bg-teal/40'} animate-[shrink_6s_linear_forwards]`}
          style={{ animation: 'shrink 6s linear forwards' }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}

// Hook to manage toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...toast, id }])
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const error = (title: string, message: string, showRefresh = true) =>
    add({ type: 'error', title, message, showRefresh })

  const success = (title: string, message: string) =>
    add({ type: 'success', title, message })

  return { toasts, dismiss, error, success }
}
