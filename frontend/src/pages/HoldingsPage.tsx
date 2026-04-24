import { useState } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { useHoldings, useCreateHolding, useUpdateHolding, useDeleteHolding } from '../hooks/useHoldings'
import { useCreateTransaction } from '../hooks/useTransactions'
import HoldingForm from '../components/holdings/HoldingForm'
import TradeDialog from '../components/holdings/TradeDialog'
import MarketBadge from '../components/holdings/MarketBadge'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { MARKETS, CURRENCY_SYMBOLS } from '../utils/constants'
import { formatNumber } from '../utils/format'
import type { Holding, HoldingCreate, HoldingUpdate } from '../types/holding'

const FILTERS = [{ value: '', label: '全部' }, ...MARKETS.map(m => ({ value: m.value, label: m.label }))]

export default function HoldingsPage() {
  const [marketFilter, setMarketFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Holding | null>(null)
  const [deleting, setDeleting] = useState<Holding | null>(null)
  const [trading, setTrading] = useState<{ holding: Holding; mode: 'BUY' | 'SELL' } | null>(null)

  const { data: holdings, isLoading } = useHoldings(marketFilter || undefined)
  const createMutation = useCreateHolding()
  const updateMutation = useUpdateHolding()
  const deleteMutation = useDeleteHolding()
  const tradeMutation = useCreateTransaction()

  const handleCreate = (data: HoldingCreate) => createMutation.mutate(data)
  const handleUpdate = (data: HoldingUpdate) => {
    if (editing) { updateMutation.mutate({ id: editing.id, data }); setEditing(null) }
  }
  const handleDelete = () => {
    if (deleting) { deleteMutation.mutate(deleting.id); setDeleting(null) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-t-primary">持仓管理</h2>
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-all duration-200"
        >
          <Plus size={16} />
          建仓
        </button>
      </div>

      {/* Market Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setMarketFilter(f.value)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              marketFilter === f.value
                ? 'bg-accent-bg text-accent'
                : 'text-t-muted hover:bg-bg-hover hover:text-t-secondary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Holdings List */}
      {isLoading ? (
        <LoadingSpinner />
      ) : !holdings || holdings.length === 0 ? (
        <EmptyState
          title="暂无持仓"
          description={marketFilter ? '该市场暂无持仓' : '点击上方"建仓"按钮开始'}
          action={
            !marketFilter ? (
              <button
                onClick={() => setFormOpen(true)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-all duration-200"
              >
                建仓
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-t-faint uppercase tracking-wider">
                <th className="px-4 py-3">名称</th>
                <th className="px-4 py-3">市场</th>
                <th className="px-4 py-3 text-right">数量</th>
                <th className="px-4 py-3 text-right">比例</th>
                <th className="px-4 py-3 text-right">成本价</th>
                <th className="px-4 py-3 text-right">现价</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => {
                const currSymbol = CURRENCY_SYMBOLS[h.currency] || ''
                return (
                  <tr key={h.id} className="border-b border-border-subtle hover:bg-bg-hover/50 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <span className="font-medium text-t-primary">{h.name}</span>
                      <span className="ml-2 text-xs text-t-faint">{h.symbol}</span>
                    </td>
                    <td className="px-4 py-3"><MarketBadge market={h.market} /></td>
                    <td className="px-4 py-3 text-right text-t-secondary">{formatNumber(h.quantity, 0)}</td>
                    <td className="px-4 py-3 text-right text-t-muted">{((h.holding_ratio ?? 1) * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right text-t-secondary">{currSymbol}{formatNumber(h.cost_price)}</td>
                    <td className="px-4 py-3 text-right text-t-primary font-medium">
                      {h.current_price !== null ? `${currSymbol}${formatNumber(h.current_price)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setTrading({ holding: h, mode: 'BUY' })}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-accent bg-accent-bg hover:opacity-80 transition-all duration-200"
                          title="买入"
                        >
                          <TrendingUp size={13} className="inline mr-0.5" />买入
                        </button>
                        <button
                          onClick={() => setTrading({ holding: h, mode: 'SELL' })}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-orange-500 bg-orange-500/10 hover:opacity-80 transition-all duration-200"
                          title="卖出"
                        >
                          <TrendingDown size={13} className="inline mr-0.5" />卖出
                        </button>
                        <button
                          onClick={() => setDeleting(h)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 bg-red-500/10 hover:opacity-80 transition-all duration-200"
                          title="删除"
                        >
                          <Trash2 size={13} className="inline mr-0.5" />删除
                        </button>
                        <button
                          onClick={() => { setEditing(h); setFormOpen(true) }}
                          className="rounded p-1.5 text-t-muted hover:bg-bg-hover hover:text-t-primary transition-colors duration-150"
                          title="编辑"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <HoldingForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSubmitCreate={handleCreate}
        onSubmitUpdate={handleUpdate}
        editing={editing}
      />

      <TradeDialog
        open={!!trading}
        onClose={() => setTrading(null)}
        holding={trading?.holding || null}
        mode={trading?.mode || 'BUY'}
        onSubmit={data => tradeMutation.mutate(data)}
      />

      <ConfirmDialog
        open={!!deleting}
        title="删除持仓"
        message={`确定要删除 "${deleting?.name}" 吗? 该持仓及所有交易记录将被删除。`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        confirmLabel="确认删除"
        danger
      />
    </div>
  )
}
