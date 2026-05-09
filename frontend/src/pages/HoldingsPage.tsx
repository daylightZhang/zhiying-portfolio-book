import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Search, ChevronLeft, ChevronRight, Link } from 'lucide-react'
import { useHoldings, useCreateHolding, useUpdateHolding, useDeleteHolding } from '../hooks/useHoldings'
import { useCreateTransaction } from '../hooks/useTransactions'
import HoldingForm from '../components/holdings/HoldingForm'
import TradeDialog from '../components/holdings/TradeDialog'
import MarketBadge from '../components/holdings/MarketBadge'
import GainLossText from '../components/common/GainLossText'
import ConfirmDialog from '../components/common/ConfirmDialog'
import MiniChart from '../components/common/MiniChart'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import CurrencySelector from '../components/dashboard/CurrencySelector'
import { MARKETS, CURRENCY_SYMBOLS } from '../utils/constants'
import { formatNumber } from '../utils/format'
import { useToast } from '../hooks/useToast'
import { useSettings } from '../hooks/useSettings'
import { useBaseCurrency, usePortfolioSummary } from '../hooks/usePortfolio'
import type { Holding, HoldingCreate, HoldingUpdate } from '../types/holding'

const FILTERS = [{ value: '', label: '全部' }, ...MARKETS.map(m => ({ value: m.value, label: m.label }))]

export default function HoldingsPage() {
  const [marketFilter, setMarketFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Holding | null>(null)
  const [deleting, setDeleting] = useState<Holding | null>(null)
  const [trading, setTrading] = useState<{ holding: Holding; mode: 'BUY' | 'SELL' } | null>(null)

  const { showToast } = useToast()
  const { settings } = useSettings()
  const pageSize = settings.holdingsPageSize
  const [baseCurrency, setBaseCurrency] = useBaseCurrency()
  const { data: summary } = usePortfolioSummary(baseCurrency)
  const { data: holdings, isLoading } = useHoldings(marketFilter || undefined)

  // Lookup map: holding id → summary data (gain_loss, weight_pct, market_value_base)
  const summaryMap = new Map(summary?.holdings.map(h => [h.id, h]) || [])

  // Reset page when pageSize changes
  useEffect(() => { setPage(0) }, [pageSize])
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
        <div className="flex items-center gap-3">
          <CurrencySelector value={baseCurrency} onChange={setBaseCurrency} />
          <button
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-all duration-200"
          >
            <Plus size={16} />
            建仓
          </button>
        </div>
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
        )?.sort((a, b) => (summaryMap.get(b.id)?.market_value_base ?? 0) - (summaryMap.get(a.id)?.market_value_base ?? 0))
        const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / pageSize))
        const paged = filtered?.slice(page * pageSize, (page + 1) * pageSize)
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
        <div className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden" style={{ minHeight: `${41 + 49 * pageSize}px` }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-t-faint uppercase tracking-wider">
                <th className="px-4 py-3">名称</th>
                <th className="px-4 py-3">市场</th>
                <th className="px-4 py-3 text-right">数量</th>
                <th className="px-4 py-3 text-right">比例</th>
                <th className="px-4 py-3 text-right">成本价</th>
                <th className="px-4 py-3 text-right">现价</th>
                <th className="px-4 py-3 text-right">市值</th>
                <th className="px-4 py-3 text-right">盈亏</th>
                <th className="px-4 py-3 text-right">仓位</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {paged?.map(h => {
                const currSymbol = CURRENCY_SYMBOLS[h.currency] || ''
                const isLinked = h.linked_broker_holding_id != null
                return (
                  <tr key={h.id} className="border-b border-border-subtle hover:bg-bg-hover/50 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <span className="font-medium text-t-primary">{h.name}</span>
                      <MiniChart symbol={h.symbol}><span className="ml-2 text-xs text-t-faint hover:text-accent transition-colors">{h.symbol}</span></MiniChart>
                      {isLinked && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-0.5 text-[10px] font-medium text-amber-600" title={`关联: ${h.broker_account_name}`}>
                          <Link size={9} />关联
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3"><MarketBadge market={h.market} /></td>
                    <td className="px-4 py-3 text-right text-t-secondary">{formatNumber(h.quantity, 0)}</td>
                    <td className="px-4 py-3 text-right text-t-muted">{((h.holding_ratio ?? 1) * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right text-t-secondary">{currSymbol}{formatNumber(h.cost_price)}</td>
                    <td className="px-4 py-3 text-right text-t-primary font-medium">
                      {h.current_price !== null ? `${currSymbol}${formatNumber(h.current_price)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-t-primary">
                      {(() => { const s = summaryMap.get(h.id); return s ? formatNumber(s.market_value_base) : '—' })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => { const s = summaryMap.get(h.id); return s ? <GainLossText value={s.gain_loss} percent={s.gain_loss_pct} size="sm" showIcon={false} /> : '—' })()}
                    </td>
                    <td className="px-4 py-3 text-right text-t-muted">
                      {summaryMap.get(h.id)?.weight_pct.toFixed(1) ?? '0.0'}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {!isLinked && (
                          <>
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
                          </>
                        )}
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
