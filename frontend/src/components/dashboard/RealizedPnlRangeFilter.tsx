import { useState, useRef, useEffect } from 'react'
import { Calendar, Check } from 'lucide-react'

export interface DateRange {
  start: string  // YYYY-MM-DD, '' = unbounded
  end: string    // YYYY-MM-DD, '' = unbounded
}

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

type PresetKey = 'thisYear' | 'lastYear' | 'last12m' | 'all' | 'custom'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function getThisYearRange(): DateRange {
  const now = new Date()
  return { start: `${now.getFullYear()}-01-01`, end: fmt(now) }
}

function getLastYearRange(): DateRange {
  const y = new Date().getFullYear() - 1
  return { start: `${y}-01-01`, end: `${y}-12-31` }
}

function getLast12mRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setFullYear(start.getFullYear() - 1)
  start.setDate(start.getDate() + 1)
  return { start: fmt(start), end: fmt(end) }
}

const PRESETS: { key: PresetKey; label: string; build: () => DateRange }[] = [
  { key: 'thisYear', label: '今年', build: getThisYearRange },
  { key: 'lastYear', label: '去年', build: getLastYearRange },
  { key: 'last12m', label: '近 12 月', build: getLast12mRange },
  { key: 'all', label: '全部', build: () => ({ start: '', end: '' }) },
]

function detectPreset(value: DateRange): PresetKey {
  for (const p of PRESETS) {
    const r = p.build()
    if (r.start === value.start && r.end === value.end) return p.key
  }
  return 'custom'
}

export default function RealizedPnlRangeFilter({ value, onChange }: Props) {
  const active = detectPreset(value)
  const [customOpen, setCustomOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setCustomOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="flex items-center gap-1.5">
      {PRESETS.map(p => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.build())}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            active === p.key
              ? 'bg-accent-bg text-accent'
              : 'text-t-muted hover:bg-bg-hover hover:text-t-secondary'
          }`}
        >
          {p.label}
        </button>
      ))}

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setCustomOpen(o => !o)}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            active === 'custom'
              ? 'bg-accent-bg text-accent'
              : 'text-t-muted hover:bg-bg-hover hover:text-t-secondary'
          }`}
        >
          <Calendar size={11} />
          {active === 'custom' && value.start && value.end
            ? `${value.start} → ${value.end}`
            : '自定义'}
        </button>

        {customOpen && (
          <div className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-border-subtle bg-bg-card/95 p-3 shadow-2xl glass animate-slideUp">
            <div className="mb-2 space-y-2">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-t-faint">开始</label>
                <input
                  type="date"
                  value={value.start}
                  onChange={e => onChange({ ...value, start: e.target.value })}
                  className="w-full rounded-lg border border-border bg-input-bg px-2 py-1.5 text-sm text-t-primary outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-t-faint">结束</label>
                <input
                  type="date"
                  value={value.end}
                  onChange={e => onChange({ ...value, end: e.target.value })}
                  className="w-full rounded-lg border border-border bg-input-bg px-2 py-1.5 text-sm text-t-primary outline-none focus:border-accent"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCustomOpen(false)}
              className="flex w-full items-center justify-center gap-1 rounded-md bg-accent py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              <Check size={12} /> 确定
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
