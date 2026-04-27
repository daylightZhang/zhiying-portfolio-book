import { useEffect, useRef, useState, useCallback } from 'react'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { usePortfolioSummary, useBaseCurrency, useRefreshPrices, useRefreshExchangeRates } from '../hooks/usePortfolio'
import CurrencySelector from '../components/dashboard/CurrencySelector'
import PortfolioSummaryCard from '../components/dashboard/PortfolioSummaryCard'
import HoldingsTable from '../components/dashboard/HoldingsTable'
import MarketBreakdownChart from '../components/dashboard/MarketBreakdownChart'
import CashPanel from '../components/dashboard/CashPanel'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import { timeAgo, formatCountdown, formatDateTime } from '../utils/format'
import { useNavigate } from 'react-router-dom'

const REFRESH_INTERVAL = 30 * 60

export default function DashboardPage() {
  const [baseCurrency, setBaseCurrency] = useBaseCurrency()
  const { data: summary, isLoading } = usePortfolioSummary(baseCurrency)
  const refreshPrices = useRefreshPrices()
  const refreshRates = useRefreshExchangeRates()
  const navigate = useNavigate()

  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const [toast, setToast] = useState<string | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval>>()
  const toastRef = useRef<ReturnType<typeof setTimeout>>()

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  const handleRefresh = useCallback(async () => {
    try {
      const [priceResult] = await Promise.all([refreshPrices.mutateAsync(), refreshRates.mutateAsync()])
      setCountdown(REFRESH_INTERVAL)
      const updated = (priceResult as Record<string, number>)?.updated ?? 0
      const failed = (priceResult as Record<string, number>)?.failed ?? 0
      showToast(`行情刷新成功: ${updated} 个更新${failed > 0 ? `, ${failed} 个失败` : ''}`)
    } catch {
      showToast('行情刷新失败，请稍后重试')
    }
  }, [refreshPrices, refreshRates])

  const isRefreshing = refreshPrices.isPending || refreshRates.isPending

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refreshPrices.mutate()
          refreshRates.mutate()
          return REFRESH_INTERVAL
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [])

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
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-bg-card/95 border border-border-subtle px-4 py-3 shadow-xl glass animate-slideUp">
          <CheckCircle2 size={16} className="text-loss shrink-0" />
          <span className="text-sm text-t-primary">{toast}</span>
        </div>
      )}

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
    </div>
  )
}
