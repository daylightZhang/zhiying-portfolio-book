import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search, Briefcase } from 'lucide-react'
import MarketBadge from './MarketBadge'
import type { BrokerPosition } from '../../types/holding'

interface Props {
  positions: BrokerPosition[] | undefined
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
}

export default function BrokerPositionSelect({ positions, value, onChange, placeholder = '选择券商持仓' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = positions?.find(p => p.id === value) || null

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const groups = useMemo(() => {
    if (!positions) return [] as Array<[string, BrokerPosition[]]>
    const q = query.trim().toLowerCase()
    const filtered = q
      ? positions.filter(p =>
          p.symbol.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.account_name.toLowerCase().includes(q)
        )
      : positions
    const map = new Map<string, BrokerPosition[]>()
    for (const p of filtered) {
      const arr = map.get(p.account_name) || []
      arr.push(p)
      map.set(p.account_name, arr)
    }
    return Array.from(map.entries())
  }, [positions, query])

  const formatQty = (q: number) => {
    if (Number.isInteger(q)) return q.toLocaleString()
    return q.toLocaleString(undefined, { maximumFractionDigits: 4 })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-input-bg px-3 py-2 text-sm outline-none transition-all duration-200 hover:border-accent focus:border-accent"
      >
        {selected ? (
          <div className="flex min-w-0 items-center gap-2">
            <MarketBadge market={selected.market} />
            <span className="font-mono text-t-primary">{selected.symbol}</span>
            <span className="truncate text-t-secondary">{selected.name}</span>
            <span className="ml-auto whitespace-nowrap text-xs text-t-faint">{formatQty(selected.quantity)} 股</span>
          </div>
        ) : (
          <span className="text-t-faint">{placeholder}</span>
        )}
        <ChevronDown size={14} className={`shrink-0 text-t-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border-subtle bg-bg-card/95 shadow-2xl glass animate-slideUp">
          <div className="flex items-center gap-2 border-b border-border-subtle bg-bg-hover/50 px-3 py-2">
            <Search size={13} className="text-t-faint" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索代码 / 名称 / 账户"
              className="flex-1 bg-transparent text-sm text-t-primary outline-none placeholder:text-t-faint"
            />
          </div>

          <div className="max-h-72 overflow-y-auto p-1">
            {groups.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-t-faint">
                {positions === undefined ? '加载中…' : query ? '没有匹配的持仓' : '暂无券商持仓'}
              </div>
            ) : (
              groups.map(([acctName, items]) => (
                <div key={acctName} className="mb-1 last:mb-0">
                  <div className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-t-faint">
                    <Briefcase size={10} />
                    {acctName}
                  </div>
                  {items.map(p => {
                    const isSelected = p.id === value
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { onChange(p.id); setOpen(false); setQuery('') }}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors duration-150 ${
                          isSelected ? 'bg-accent-bg' : 'hover:bg-bg-hover'
                        }`}
                      >
                        <MarketBadge market={p.market} />
                        <span className="font-mono text-t-primary">{p.symbol}</span>
                        <span className="min-w-0 flex-1 truncate text-left text-t-secondary">{p.name}</span>
                        <span className="whitespace-nowrap text-xs text-t-muted">{formatQty(p.quantity)} 股</span>
                        {isSelected && <Check size={14} className="text-accent" />}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
