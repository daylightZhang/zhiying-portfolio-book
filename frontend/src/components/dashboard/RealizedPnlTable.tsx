import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { RealizedPnlItem } from '../../types/portfolio'
import { formatNumber } from '../../utils/format'
import { useSettings } from '../../hooks/useSettings'

interface Props {
  items: RealizedPnlItem[]
  currency: string
}

export default function RealizedPnlTable({ items, currency }: Props) {
  const { settings } = useSettings()
  const pageSize = settings.holdingsPageSize
  const [page, setPage] = useState(1)

  // Sort by absolute value descending
  const sorted = [...items].sort((a, b) => Math.abs(b.realized_pnl_base) - Math.abs(a.realized_pnl_base))

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-card/60 text-t-muted text-left text-xs">
              <th className="px-3 py-2.5 font-medium">代码</th>
              <th className="px-3 py-2.5 font-medium">名称</th>
              <th className="px-3 py-2.5 font-medium">来源</th>
              <th className="px-3 py-2.5 font-medium text-right">已实现盈亏 (本币)</th>
              <th className="px-3 py-2.5 font-medium text-right">已实现盈亏 ({currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {paged.map((item) => {
              const pnlColor = item.realized_pnl_base > 0 ? 'text-gain' : item.realized_pnl_base < 0 ? 'text-loss' : 'text-t-secondary'
              return (
                <tr key={`${item.holding_id}-${item.source}`} className="hover:bg-bg-card/40 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-accent font-medium">{item.symbol}</td>
                  <td className="px-3 py-2.5 text-t-primary max-w-[180px] truncate">{item.name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${item.source === 'linked' ? 'bg-blue-500/15 text-blue-500' : 'bg-gray-500/15 text-t-muted'}`}>
                      {item.source === 'linked' ? '关联' : '自有'}
                    </span>
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${pnlColor}`}>
                    {item.realized_pnl_native > 0 ? '+' : ''}{formatNumber(item.realized_pnl_native)} {item.currency}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${pnlColor}`}>
                    {item.realized_pnl_base > 0 ? '+' : ''}{formatNumber(item.realized_pnl_base)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-t-muted">
          <span>共 {sorted.length} 条</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded text-xs ${
                  p === currentPage ? 'bg-accent text-white' : 'hover:bg-bg-card text-t-muted'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
