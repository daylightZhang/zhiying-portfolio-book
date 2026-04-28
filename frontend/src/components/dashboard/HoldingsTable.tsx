import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HoldingSummary } from '../../types/portfolio'
import MarketBadge from '../holdings/MarketBadge'
import GainLossText from '../common/GainLossText'
import { formatNumber, formatCurrency } from '../../utils/format'
import { useSettings } from '../../hooks/useSettings'

interface Props {
  holdings: HoldingSummary[]
  currency: string
}

export default function HoldingsTable({ holdings, currency }: Props) {
  const [page, setPage] = useState(0)
  const { settings } = useSettings()
  const pageSize = settings.holdingsPageSize

  // Reset page when pageSize changes
  useEffect(() => { setPage(0) }, [pageSize])

  // Sort by market_value_base descending
  const sorted = [...holdings].sort((a, b) => b.market_value_base - a.market_value_base)
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden" style={{ minHeight: `${41 + 49 * pageSize}px` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-t-faint uppercase tracking-wider">
                <th className="px-4 py-3">持仓</th>
                <th className="px-4 py-3">市场</th>
                <th className="px-4 py-3 text-right">数量</th>
                <th className="px-4 py-3 text-right">成本价</th>
                <th className="px-4 py-3 text-right">现价</th>
                <th className="px-4 py-3 text-right">市值</th>
                <th className="px-4 py-3 text-right">盈亏</th>
                <th className="px-4 py-3 text-right">占比</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(h => (
                <tr key={h.id} className="border-b border-border-subtle hover:bg-bg-hover/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-t-primary">{h.name}</span>
                      <span className="ml-2 text-xs text-t-faint">{h.symbol}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><MarketBadge market={h.market} /></td>
                  <td className="px-4 py-3 text-right text-t-secondary">{formatNumber(h.quantity, 0)}</td>
                  <td className="px-4 py-3 text-right text-t-secondary">{formatCurrency(h.cost_price, h.currency, 3)}</td>
                  <td className="px-4 py-3 text-right text-t-primary font-medium">
                    {h.current_price !== null ? formatCurrency(h.current_price, h.currency, 3) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-t-primary">
                    {formatCurrency(h.market_value_base, currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <GainLossText value={h.gain_loss} percent={h.gain_loss_pct} size="sm" showIcon={false} />
                  </td>
                  <td className="px-4 py-3 text-right text-t-muted">{h.weight_pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-t-muted">
          <span>共 {sorted.length} 个持仓</span>
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
    </div>
  )
}
