import type { HoldingSummary } from '../../types/portfolio'
import MarketBadge from '../holdings/MarketBadge'
import GainLossText from '../common/GainLossText'
import { formatNumber, formatCurrency } from '../../utils/format'

interface Props {
  holdings: HoldingSummary[]
  currency: string
}

export default function HoldingsTable({ holdings, currency }: Props) {
  return (
    <div className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
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
            {holdings.map(h => (
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
  )
}
