import { useState, useEffect } from 'react'
import { X, Clock } from 'lucide-react'
import type { Transaction, TransactionUpdate } from '../../types/transaction'

interface Props {
  open: boolean
  tx: Transaction | null
  onClose: () => void
  onSubmit: (data: TransactionUpdate) => void
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// Convert ISO string to local datetime-local input value (YYYY-MM-DDTHH:mm)
function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert datetime-local value (interpreted as local) back to UTC ISO with offset
function localInputToIso(local: string): string {
  return new Date(local).toISOString()
}

export default function EditTransactionDialog({ open, tx, onClose, onSubmit }: Props) {
  const [transactedAt, setTransactedAt] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (tx) {
      setTransactedAt(isoToLocalInput(tx.transacted_at))
      setNotes(tx.notes || '')
    }
  }, [tx])

  if (!open || !tx) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!transactedAt) return
    onSubmit({
      transacted_at: localInputToIso(transactedAt),
      notes: notes,
    })
    onClose()
  }

  const inputClass = 'w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-t-primary outline-none focus:border-accent transition-colors placeholder:text-t-faint'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-bg-card/90 p-6 shadow-2xl border border-border-subtle glass animate-scaleIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-accent-bg p-1.5">
              <Clock size={16} className="text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-t-primary">修改交易记录</h2>
              <p className="text-xs text-t-faint">
                {tx.holding_name || '—'}
                {tx.holding_symbol && <span className="ml-1 text-t-muted">({tx.holding_symbol})</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-t-muted hover:text-t-secondary transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-t-muted mb-1">实际交易时间</label>
            <input
              type="datetime-local"
              value={transactedAt}
              onChange={e => setTransactedAt(e.target.value)}
              required
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-t-faint">按你的本地时区填写</p>
          </div>

          <div>
            <label className="block text-xs text-t-muted mb-1">备注</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={inputClass}
              placeholder="可选"
            />
          </div>

          <div className="rounded-lg bg-bg-hover p-3 text-xs text-t-muted space-y-1">
            <div>仅支持修改时间和备注；数量、价格如有错误请删除后重新创建</div>
            <div>修改时间会按交易顺序重算成本基准</div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border bg-input-bg py-2 text-sm font-medium text-t-secondary hover:bg-bg-hover transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white hover:opacity-90 transition-all duration-200"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
