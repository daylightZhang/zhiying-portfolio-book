import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../utils/format'

interface Props {
  totalValue: number
  totalCost: number
  totalCash: number
  gainLoss: number
  gainLossPct: number
  currency: string
}

export default function PortfolioSummaryCard({ totalValue, totalCost, totalCash, gainLoss, gainLossPct, currency }: Props) {
  const isGain = gainLoss >= 0

  return (
    <div className="rounded-2xl bg-bg-card p-6 border border-border-subtle card-hover">
      <p className="text-sm text-t-muted mb-1">资产总值</p>
      <p className="text-3xl font-bold text-t-primary tracking-tight">
        {formatCurrency(totalValue, currency)}
      </p>

      <div className="mt-4 flex items-center gap-6">
        <div>
          <p className="text-xs text-t-faint">持仓市值</p>
          <p className="text-sm text-t-secondary">{formatCurrency(totalValue - totalCash, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-t-faint">现金</p>
          <p className="text-sm text-t-secondary">{formatCurrency(totalCash, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-t-faint">总成本</p>
          <p className="text-sm text-t-secondary">{formatCurrency(totalCost, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-t-faint">持仓盈亏</p>
          <div className={`flex items-center gap-1 text-sm font-medium ${isGain ? 'text-gain' : 'text-loss'}`}>
            {isGain ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>
              {isGain ? '+' : ''}{formatCurrency(gainLoss, currency)}
              <span className="ml-1 text-xs">({formatPercent(gainLossPct)})</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
