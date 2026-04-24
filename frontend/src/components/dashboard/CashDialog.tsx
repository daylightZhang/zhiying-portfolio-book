import { useState } from 'react'
import { X, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import CustomSelect from '../common/CustomSelect'
import { CURRENCIES, CURRENCY_SYMBOLS } from '../../utils/constants'

const CURRENCY_OPTIONS = CURRENCIES.map(c => ({ value: c, label: `${CURRENCY_SYMBOLS[c]} ${c}` }))

interface Props {
  open: boolean
  mode: 'deposit' | 'withdraw'
  onClose: () => void
  onSubmit: (currency: string, amount: number, notes?: string) => void
}

export default function CashDialog({ open, mode, onClose, onSubmit }: Props) {
  const [currency, setCurrency] = useState('CNY')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  if (!open) return null

  const isDeposit = mode === 'deposit'
  const Icon = isDeposit ? ArrowDownToLine : ArrowUpFromLine

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(currency, parseFloat(amount), notes.trim() || undefined)
    setAmount('')
    setNotes('')
    onClose()
  }

  const inputClass = 'w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-t-primary outline-none focus:border-accent transition-colors placeholder:text-t-faint'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-bg-card/90 p-6 shadow-2xl border border-border-subtle glass animate-scaleIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-1.5 ${isDeposit ? 'bg-accent-bg' : 'bg-orange-500/15'}`}>
              <Icon size={16} className={isDeposit ? 'text-accent' : 'text-orange-500'} />
            </div>
            <h2 className="text-lg font-semibold text-t-primary">{isDeposit ? '入金' : '出金'}</h2>
          </div>
          <button onClick={onClose} className="text-t-muted hover:text-t-secondary transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-t-muted mb-1">币种</label>
            <CustomSelect options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
          </div>
          <div>
            <label className="block text-xs text-t-muted mb-1">金额</label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              className={inputClass}
              placeholder="输入金额"
            />
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
          <button
            type="submit"
            className={`w-full rounded-lg py-2.5 text-sm font-medium text-white hover:opacity-90 transition-all duration-200 ${
              isDeposit ? 'bg-accent' : 'bg-orange-500'
            }`}
          >
            确认{isDeposit ? '入金' : '出金'}
          </button>
        </form>
      </div>
    </div>
  )
}
