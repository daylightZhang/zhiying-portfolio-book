import { useState } from 'react'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import type { Holding } from '../../types/holding'

interface Props {
  open: boolean
  onClose: () => void
  holding: Holding | null
  mode: 'BUY' | 'SELL'
  onSubmit: (data: { holding_id: number; type: 'BUY' | 'SELL'; quantity: number; price: number; notes?: string; transacted_at: string }) => void
}

export default function TradeDialog({ open, onClose, holding, mode, onSubmit }: Props) {
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  if (!open || !holding) return null

  const isBuy = mode === 'BUY'
  const accentColor = isBuy ? 'bg-accent' : 'bg-orange-500'
  const Icon = isBuy ? TrendingUp : TrendingDown

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      holding_id: holding.id,
      type: mode,
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      notes: notes.trim() || undefined,
      transacted_at: new Date().toISOString(),
    })
    setQuantity('')
    setPrice('')
    setNotes('')
    onClose()
  }

  const inputClass = 'w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-t-primary outline-none focus:border-accent transition-colors placeholder:text-t-faint'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-bg-card/90 p-6 shadow-2xl border border-border-subtle glass animate-scaleIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-1.5 ${isBuy ? 'bg-accent-bg' : 'bg-orange-500/15'}`}>
              <Icon size={16} className={isBuy ? 'text-accent' : 'text-orange-500'} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-t-primary">{isBuy ? '买入' : '卖出'}</h2>
              <p className="text-xs text-t-faint">{holding.name} ({holding.symbol})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-t-muted hover:text-t-secondary transition-colors">
            <X size={20} />
          </button>
        </div>

        {mode === 'SELL' && (
          <div className="mb-4 rounded-lg bg-bg-hover p-3 text-sm">
            <span className="text-t-faint">当前持仓: </span>
            <span className="font-medium text-t-primary">{holding.quantity}</span>
            <span className="text-t-faint"> 股</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-t-muted mb-1">数量</label>
            <input
              type="number"
              step="any"
              min="0.01"
              max={mode === 'SELL' ? holding.quantity : undefined}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
              className={inputClass}
              placeholder={mode === 'SELL' ? `最多 ${holding.quantity}` : '输入数量'}
            />
          </div>
          <div>
            <label className="block text-xs text-t-muted mb-1">价格</label>
            <input
              type="number"
              step="any"
              min="0.001"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              className={inputClass}
              placeholder={holding.current_price ? `当前价 ${holding.current_price}` : '输入价格'}
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

          {quantity && price && (
            <div className="rounded-lg bg-bg-hover p-3 text-sm animate-fadeIn">
              <span className="text-t-faint">交易金额: </span>
              <span className="font-medium text-t-primary">
                {(parseFloat(quantity) * parseFloat(price)).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <button
            type="submit"
            className={`w-full rounded-lg ${accentColor} py-2.5 text-sm font-medium text-white hover:opacity-90 transition-all duration-200`}
          >
            确认{isBuy ? '买入' : '卖出'}
          </button>
        </form>
      </div>
    </div>
  )
}
