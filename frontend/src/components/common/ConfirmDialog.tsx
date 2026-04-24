interface Props {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  danger?: boolean
}

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = '确认', danger = false }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay animate-fadeIn" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-xl bg-bg-card/90 p-6 shadow-2xl border border-border-subtle glass animate-scaleIn" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-t-primary">{title}</h3>
        <p className="mt-2 text-sm text-t-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-t-secondary hover:bg-bg-hover transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-accent hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
