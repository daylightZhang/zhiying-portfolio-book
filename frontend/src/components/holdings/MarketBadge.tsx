import { MARKET_COLORS, MARKET_LABELS } from '../../utils/constants'

export default function MarketBadge({ market }: { market: string }) {
  const colorClass = MARKET_COLORS[market] || 'bg-slate-500/20 text-slate-400'
  const label = MARKET_LABELS[market] || market

  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
