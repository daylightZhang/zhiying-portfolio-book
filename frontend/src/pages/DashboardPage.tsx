import { useEffect, useRef, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { usePortfolioSummary, useBaseCurrency, useRefreshPrices, useRefreshExchangeRates } from '../hooks/usePortfolio'
import { useToast } from '../hooks/useToast'
import CurrencySelector from '../components/dashboard/CurrencySelector'
import PortfolioSummaryCard from '../components/dashboard/PortfolioSummaryCard'
import HoldingsTable from '../components/dashboard/HoldingsTable'
import RealizedPnlTable from '../components/dashboard/RealizedPnlTable'
import RealizedPnlRangeFilter, { getThisYearRange, type DateRange } from '../components/dashboard/RealizedPnlRangeFilter'
import MarketBreakdownChart from '../components/dashboard/MarketBreakdownChart'
import CashPanel from '../components/dashboard/CashPanel'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { timeAgo, formatCountdown, formatDateTime } from '../utils/format'
import { useNavigate } from 'react-router-dom'

const REFRESH_INTERVAL = 5 * 60

export default function DashboardPage() {
  const [baseCurrency, setBaseCurrency] = useBaseCurrency()
  const [realizedRange, setRealizedRange] = useState<DateRange>(getThisYearRange)
  const { data: summary, isLoading } = usePortfolioSummary(baseCurrency, realizedRange.start, realizedRange.end)

  // 切换区间后保持区段底部可见
  const realizedSectionRef = useRef<HTMLDivElement>(null)
  const pendingRealizedScrollRef = useRef(false)
  const handleRealizedRangeChange = useCallback((next: DateRange) => {
    setRealizedRange(next)
    pendingRealizedScrollRef.current = true
  }, [])

  useEffect(() => {
    if (!pendingRealizedScrollRef.current) return
    if (!summary) return
    pendingRealizedScrollRef.current = false
    requestAnimationFrame(() => {
      realizedSectionRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
    })
  }, [summary])
  const refreshPrices = useRefreshPrices()
  const refreshRates = useRefreshExchangeRates()
  const navigate = useNavigate()

  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const countdownRef = useRef<ReturnType<typeof setInterval>>()
  const { showToast } = useToast()

  const calcCountdown = useCallback(() => {
    if (!summary?.last_refreshed) return REFRESH_INTERVAL
    const lastMs = new Date(summary.last_refreshed).getTime()
    const remaining = Math.ceil((lastMs + REFRESH_INTERVAL * 1000 - Date.now()) / 1000)
    return Math.max(0, remaining)
  }, [summary?.last_refreshed])

  const handleRefresh = useCallback(async () => {
    try {
      const [priceResult] = await Promise.all([refreshPrices.mutateAsync(), refreshRates.mutateAsync()])
      const res = priceResult as Record<string, unknown>
      const updated = (res?.updated as number) ?? 0
      const failed = (res?.failed as number) ?? 0
      if (failed > 0) {
        const details = (res?.details as Array<Record<string, string>>) || []
        const failedSymbols = details.filter(d => d.status === 'failed').map(d => d.symbol).join(', ')
        showToast(`行情刷新: ${updated} 个成功, ${failed} 个失败 (${failedSymbols})`, 'error')
      } else {
        showToast(`行情刷新成功: ${updated} 个更新`)
      }
    } catch {
      showToast('行情刷新失败，请稍后重试', 'error')
    }
  }, [refreshPrices, refreshRates, showToast])

  const isRefreshing = refreshPrices.isPending || refreshRates.isPending

  // Sync countdown from last_refreshed
  useEffect(() => {
    setCountdown(calcCountdown())
  }, [calcCountdown])

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      const remaining = calcCountdown()
      setCountdown(remaining)
      if (remaining <= 0 && !isRefreshing) {
        handleRefresh()
      }
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [calcCountdown, handleRefresh, isRefreshing])

  if (isLoading) return <LoadingSpinner />

  const hasHoldings = summary && summary.holdings.length > 0
  const hasCash = summary && Object.keys(summary.cash_balances || {}).length > 0
  const isEmpty = !hasHoldings && !hasCash

  if (isEmpty) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-t-primary mb-6">总览</h2>
        <EmptyState
          title="还没有持仓"
          description="添加你的第一个持仓开始追踪投资"
          action={
            <button
              onClick={() => navigate('/holdings')}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors"
            >
              去添加持仓
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-t-primary">总览</h2>
        <div className="flex items-center gap-3">
          {summary?.last_refreshed && (
            <span className="text-xs text-t-faint" title={formatDateTime(summary.last_refreshed)}>
              更新于 {timeAgo(summary.last_refreshed)} ({formatDateTime(summary.last_refreshed)})
            </span>
          )}
          <span className="text-xs text-t-faint tabular-nums">{formatCountdown(countdown)} 后刷新</span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg bg-bg-hover px-3 py-1.5 text-xs text-t-secondary hover:opacity-80 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? '刷新中...' : '刷新行情'}
          </button>
          <CurrencySelector value={baseCurrency} onChange={setBaseCurrency} />
        </div>
      </div>

      {/* Summary Card */}
      {summary && (
        <PortfolioSummaryCard
          totalValue={summary.total_market_value + summary.total_cash}
          totalCost={summary.total_cost}
          totalCash={summary.total_cash}
          gainLoss={summary.total_gain_loss}
          gainLossPct={summary.total_gain_loss_pct}
          realizedPnl={summary.total_realized_pnl}
          currency={baseCurrency}
        />
      )}

      {/* Cash + Breakdowns */}
      <div className="grid grid-cols-3 gap-4">
        {summary && (
          <CashPanel
            cashBalances={summary.cash_balances}
            totalCash={summary.total_cash}
            futuresMargin={summary.futures_margin}
            baseCurrency={baseCurrency}
          />
        )}
        {summary && <MarketBreakdownChart data={summary.by_market} currency={baseCurrency} title="市场分布" />}
        {summary && <MarketBreakdownChart data={summary.by_currency} currency={baseCurrency} title="币种分布" />}
      </div>

      {/* Holdings Table */}
      {hasHoldings && summary && (
        <div>
          <h3 className="text-sm font-medium text-t-muted mb-3">持仓明细</h3>
          <HoldingsTable holdings={summary.holdings} currency={baseCurrency} />
        </div>
      )}

      {/* Realized P&L Table */}
      {summary && (
        <div ref={realizedSectionRef}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-t-muted">已实现盈亏</h3>
            <RealizedPnlRangeFilter value={realizedRange} onChange={handleRealizedRangeChange} />
          </div>
          {summary.realized_pnl_details.length > 0 ? (
            <RealizedPnlTable items={summary.realized_pnl_details} currency={baseCurrency} />
          ) : (
            <div className="rounded-xl border border-border-subtle bg-bg-card/40 px-4 py-16 text-center text-sm text-t-faint">
              当前区间内无已实现盈亏
            </div>
          )}
        </div>
      )}
    </div>
  )
}
