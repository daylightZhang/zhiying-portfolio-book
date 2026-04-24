import type { MarketBreakdown } from '../../types/portfolio'
import { formatCurrency } from '../../utils/format'

const BAR_COLORS = [
  'bg-blue-500', 'bg-red-500', 'bg-orange-400', 'bg-indigo-500',
  'bg-yellow-500', 'bg-emerald-500', 'bg-slate-500',
]

interface Props {
  data: Record<string, MarketBreakdown>
  currency: string
  title: string
}

export default function MarketBreakdownChart({ data, currency, title }: Props) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b.value - a.value)
  if (entries.length === 0) return null

  return (
    <div className="rounded-2xl bg-bg-card p-5 border border-border-subtle card-hover">
      <h3 className="text-sm font-medium text-t-muted mb-4">{title}</h3>

      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-bg-hover mb-4">
        {entries.map(([key, val], i) => (
          <div
            key={key}
            className={`${BAR_COLORS[i % BAR_COLORS.length]} transition-all duration-500`}
            style={{ width: `${val.weight_pct}%` }}
            title={`${key}: ${val.weight_pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {entries.map(([key, val], i) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} />
              <span className="text-t-secondary">{key}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-t-muted">{val.weight_pct.toFixed(1)}%</span>
              <span className="text-t-primary min-w-[100px] text-right">{formatCurrency(val.value, currency)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
