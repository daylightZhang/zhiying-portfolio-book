import { useState } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useHoldings, useCreateHolding, useUpdateHolding, useDeleteHolding } from '../hooks/useHoldings'
import { useCreateTransaction } from '../hooks/useTransactions'
import HoldingForm from '../components/holdings/HoldingForm'
import TradeDialog from '../components/holdings/TradeDialog'
import MarketBadge from '../components/holdings/MarketBadge'
import GainLossText from '../components/common/GainLossText'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { MARKETS, CURRENCY_SYMBOLS } from '../utils/constants'
import { formatNumber } from '../utils/format'
import { useToast } from '../hooks/useToast'
import type { Holding, HoldingCreate, HoldingUpdate } from '../types/holding'

const FILTERS = [{ value: '', label: '全部' }, ...MARKETS.map(m => ({ value: m.value, label: m.label }))]
const PAGE_SIZE = 10

function holdingMarketValue(h: Holding): number {
  return (h.current_price || 0) * h.quantity * (h.contract_multiplier || 1) * (h.holding_ratio || 1)
}

function holdingGainLoss(h: Holding): { value: number; pct: number } {
  const price = h.current_price || 0
  const mult = h.contract_multiplier || 1
  const ratio = h.holding_ratio || 1
  const mv = price * h.quantity * mult * ratio
  const cost = h.cost_price * h.quantity * mult * ratio
  const gl = mv - cost
  const pct = cost !== 0 ? (gl / cost) * 100 : 0
  return { value: gl, pct }
}

export default function HoldingsPage() {
  const [marketFilter, setMarketFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Holding | null>(null)
  const [deleting, setDeleting] = useState<Holding | null>(null)
  const [trading, setTrading] = useState<{ holding: Holding; mode: 'BUY' | 'SELL' } | null>(null)

  const { showToast } = useToast()
  const { data: holdings, isLoading } = useHoldings(marketFilter || undefined)
  const createMutation = useCreateHolding()
  const updateMutation = useUpdateHolding()
  const deleteMutation = useDeleteHolding()
  const tradeMutation = useCreateTransaction()

  const handleCreate = (data: HoldingCreate) => {
    createMutation.mutate(data, {
      onSuccess: () => showToast('建仓成功'),
      onError: () => showToast('建仓失败', 'error'),
    })
  }
  const handleUpdate = (data: HoldingUpdate) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data }, {
        onSuccess: () => showToast('修改成功'),
        onError: () => showToast('修改失败', 'error'),
      })
      setEditing(null)
    }
  }
  const handleDelete = () => {
    if (deleting) {
      deleteMutation.mutate(deleting.id, {
        onSuccess: () => showToast('删除成功'),
        onError: () => showToast('删除失败', 'error'),
      })
      setDeleting(null)
    }
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

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setMarketFilter(f.value); setPage(0) }}
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
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t-faint" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="搜索名称或代码"
            className="rounded-lg border border-border bg-input-bg pl-8 pr-3 py-1.5 text-xs text-t-primary outline-none focus:border-accent transition-colors placeholder:text-t-faint w-44"
          />
        </div>
      </div>

      {/* Holdings List */}
      {(() => {
        const kw = search.trim().toLowerCase()
        const filtered = holdings?.filter(h =>
          !kw || h.name.toLowerCase().includes(kw) || h.symbol.toLowerCase().includes(kw)
        )?.sort((a, b) => holdingMarketValue(b) - holdingMarketValue(a))
        const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / PAGE_SIZE))
        const paged = filtered?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        return isLoading ? (
        <LoadingSpinner />
      ) : !filtered || filtered.length === 0 ? (
        <EmptyState
          title="暂无持仓"
          description={search ? '未找到匹配的持仓' : marketFilter ? '该市场暂无持仓' : '点击上方"建仓"按钮开始'}
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
        <>
        <div className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden" style={{ minHeight: `${41 + 49 * PAGE_SIZE}px` }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-t-faint uppercase tracking-wider">
                <th className="px-4 py-3">名称</th>
                <th className="px-4 py-3">市场</th>
                <th className="px-4 py-3 text-right">数量</th>
                <th className="px-4 py-3 text-right">比例</th>
                <th className="px-4 py-3 text-right">成本价</th>
                <th className="px-4 py-3 text-right">现价</th>
                <th className="px-4 py-3 text-right">盈亏</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {paged?.map(h => {
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
                      {h.current_price !== null ? (() => { const gl = holdingGainLoss(h); return <GainLossText value={gl.value} percent={gl.pct} size="sm" showIcon={false} /> })() : '—'}
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-t-muted mt-3">
            <span>共 {filtered?.length || 0} 个持仓</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-lg p-1.5 hover:bg-bg-hover disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="tabular-nums">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-lg p-1.5 hover:bg-bg-hover disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
        </>
      )
      })()}

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
        onSubmit={data => tradeMutation.mutate(data, {
          onSuccess: () => showToast(trading?.mode === 'BUY' ? '买入成功' : '卖出成功'),
          onError: () => showToast(trading?.mode === 'BUY' ? '买入失败' : '卖出失败', 'error'),
        })}
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
