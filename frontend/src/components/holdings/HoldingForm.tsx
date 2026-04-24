import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { MARKETS, CN_FUTURES_PRODUCTS } from '../../utils/constants'
import CustomSelect from '../common/CustomSelect'
import type { Holding, HoldingCreate, HoldingUpdate } from '../../types/holding'

const MARKET_OPTIONS = MARKETS.map(m => ({ value: m.value, label: m.label, hint: m.hint }))

function guessMultiplier(symbol: string): number {
  const upper = symbol.toUpperCase().replace(/[0-9]/g, '')
  const match = CN_FUTURES_PRODUCTS.find(p => p.code === upper)
  return match?.multiplier ?? 1
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmitCreate?: (data: HoldingCreate) => void
  onSubmitUpdate?: (data: HoldingUpdate) => void
  editing?: Holding | null
}

export default function HoldingForm({ open, onClose, onSubmitCreate, onSubmitUpdate, editing }: Props) {
  const [market, setMarket] = useState('A_SHARE')
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [holdingRatio, setHoldingRatio] = useState('100')
  const [contractMultiplier, setContractMultiplier] = useState('1')
  const [notes, setNotes] = useState('')

  const selectedMarket = MARKETS.find(m => m.value === market)
  const isFutures = market === 'CN_FUTURES'

  useEffect(() => {
    if (editing) {
      setMarket(editing.market)
      setSymbol(editing.symbol)
      setName(editing.name)
      setQuantity(String(editing.quantity))
      setCostPrice(String(editing.cost_price))
      setHoldingRatio(String((editing.holding_ratio ?? 1) * 100))
      setContractMultiplier(String(editing.contract_multiplier ?? 1))
      setNotes(editing.notes || '')
    } else {
      setMarket('A_SHARE')
      setSymbol('')
      setName('')
      setQuantity('')
      setCostPrice('')
      setHoldingRatio('100')
      setContractMultiplier('1')
      setNotes('')
    }
  }, [editing, open])

  // Auto-fill multiplier when futures symbol changes
  useEffect(() => {
    if (isFutures && symbol && !editing) {
      const m = guessMultiplier(symbol)
      if (m > 1) setContractMultiplier(String(m))
    }
  }, [symbol, isFutures, editing])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const ratio = Math.min(1, Math.max(0, parseFloat(holdingRatio) / 100))
    const multiplier = isFutures ? parseFloat(contractMultiplier) || 1 : 1

    if (editing && onSubmitUpdate) {
      onSubmitUpdate({
        name: name.trim(),
        quantity: parseFloat(quantity),
        cost_price: parseFloat(costPrice),
        holding_ratio: ratio,
        contract_multiplier: multiplier,
        notes: notes.trim() || undefined,
      })
    } else if (onSubmitCreate) {
      onSubmitCreate({
        symbol: symbol.trim(),
        name: name.trim(),
        market,
        quantity: parseFloat(quantity),
        cost_price: parseFloat(costPrice),
        holding_ratio: ratio,
        contract_multiplier: multiplier,
        currency: selectedMarket?.currency,
        notes: notes.trim() || undefined,
      })
    }
    onClose()
  }

  const inputClass = 'w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-t-primary outline-none focus:border-accent transition-colors placeholder:text-t-faint'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-bg-card/90 p-6 shadow-2xl border border-border-subtle glass animate-scaleIn max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-t-primary">{editing ? '编辑持仓' : '建仓'}</h2>
          <button onClick={onClose} className="text-t-muted hover:text-t-secondary transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div>
              <label className="block text-xs text-t-muted mb-1">市场</label>
              <CustomSelect options={MARKET_OPTIONS} value={market} onChange={setMarket} placeholder="选择市场" />
            </div>
          )}

          {!editing && (
            <div>
              <label className="block text-xs text-t-muted mb-1">代码</label>
              <input
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                placeholder={selectedMarket?.hint}
                required
                className={inputClass}
              />
              {isFutures && (
                <div className="mt-2 rounded-lg bg-bg-hover p-2.5 text-xs text-t-faint animate-fadeIn">
                  <p className="font-medium text-t-muted mb-1">中金所品种 (合约乘数):</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {CN_FUTURES_PRODUCTS.map(p => (
                      <span key={p.code}>
                        <span className="text-accent font-medium">{p.code}</span> {p.name}
                        <span className="text-t-faint"> ×{p.multiplier}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-1.5">主力合约加 0 (如 IF0)，指定合约加年月 (如 IF2406)</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs text-t-muted mb-1">名称</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如 贵州茅台"
              required
              className={inputClass}
            />
          </div>

          <div className={`grid gap-3 ${isFutures ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <div>
              <label className="block text-xs text-t-muted mb-1">数量</label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-t-muted mb-1">成本价</label>
              <input
                type="number"
                step="any"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            {!isFutures && (
              <div>
                <label className="block text-xs text-t-muted mb-1">持有比例 %</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={holdingRatio}
                  onChange={e => setHoldingRatio(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="100"
                />
              </div>
            )}
          </div>

          {isFutures && (
            <div className="grid grid-cols-2 gap-3 animate-fadeIn">
              <div>
                <label className="block text-xs text-t-muted mb-1">合约乘数</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={contractMultiplier}
                  onChange={e => setContractMultiplier(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-t-muted mb-1">持有比例 %</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={holdingRatio}
                  onChange={e => setHoldingRatio(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="100"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-t-muted mb-1">备注</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="可选"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 transition-all duration-200"
          >
            {editing ? '保存修改' : '确认建仓'}
          </button>
        </form>
      </div>
    </div>
  )
}
