import { useMarketIndices } from '../../hooks/useMarketIndices'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function MarketTicker({ collapsed = false }: { collapsed?: boolean }) {
  const { data: indices } = useMarketIndices()

  if (!indices || indices.length === 0) return null

  const items = [...indices, ...indices]

  return (
    <div className={`fixed bottom-0 right-0 z-50 h-9 overflow-hidden border-t border-border-subtle bg-bg-card/80 glass transition-all duration-300 ${collapsed ? 'left-16' : 'left-56'}`}>
      <div className="flex h-full animate-marquee whitespace-nowrap">
        {items.map((idx, i) => {
          const isUp = idx.change >= 0
          return (
            <div key={`${idx.symbol}-${i}`} className="inline-flex items-center gap-2 px-6 text-xs">
              <span className="font-medium text-t-secondary">{idx.name}</span>
              <span className="text-t-primary font-medium">{idx.price.toLocaleString()}</span>
              <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-gain' : 'text-loss'}`}>
                {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {isUp ? '+' : ''}{idx.change}
                <span className="ml-0.5">({isUp ? '+' : ''}{idx.change_pct}%)</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
