import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getChart } from '../../api/portfolio'
import type { ChartCandle } from '../../api/portfolio'

interface Props {
  symbol: string
  children: React.ReactNode
}

function CandleChart({ candles }: { candles: ChartCandle[] }) {
  const width = 320
  const height = 160
  const padding = { top: 12, right: 8, bottom: 20, left: 45 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  if (candles.length < 2) return <div className="text-xs text-t-muted p-4">数据不足</div>

  const highs = candles.map(c => c.high)
  const lows = candles.map(c => c.low)
  const maxPrice = Math.max(...highs)
  const minPrice = Math.min(...lows)
  const priceRange = maxPrice - minPrice || 1

  const candleWidth = Math.max(2, (chartW / candles.length) * 0.7)
  const gap = chartW / candles.length

  const yScale = (price: number) => padding.top + chartH - ((price - minPrice) / priceRange) * chartH

  // Price grid lines
  const gridLines = 4
  const priceStep = priceRange / gridLines

  return (
    <svg width={width} height={height} className="block">
      {/* Grid lines + labels */}
      {Array.from({ length: gridLines + 1 }, (_, i) => {
        const price = minPrice + priceStep * i
        const y = yScale(price)
        return (
          <g key={i}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="currentColor" className="text-border-subtle" strokeWidth={0.5} strokeDasharray="2,2" />
            <text x={padding.left - 4} y={y + 3} textAnchor="end" className="fill-t-faint" fontSize={9}>
              {price.toFixed(price >= 100 ? 0 : 2)}
            </text>
          </g>
        )
      })}
      {/* Candles */}
      {candles.map((c, i) => {
        const x = padding.left + i * gap + gap / 2
        const isUp = c.close >= c.open
        const color = isUp ? '#ef4444' : '#22c55e'
        const bodyTop = yScale(Math.max(c.open, c.close))
        const bodyBottom = yScale(Math.min(c.open, c.close))
        const bodyH = Math.max(1, bodyBottom - bodyTop)
        return (
          <g key={i}>
            {/* Wick */}
            <line x1={x} x2={x} y1={yScale(c.high)} y2={yScale(c.low)} stroke={color} strokeWidth={0.8} />
            {/* Body */}
            <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyH} fill={color} />
          </g>
        )
      })}
      {/* Date labels */}
      {candles.filter((_, i) => i % Math.ceil(candles.length / 4) === 0).map((c, i) => {
        const idx = candles.indexOf(c)
        const x = padding.left + idx * gap + gap / 2
        const date = new Date(c.timestamp * 1000)
        const label = `${date.getMonth() + 1}/${date.getDate()}`
        return (
          <text key={i} x={x} y={height - 4} textAnchor="middle" className="fill-t-faint" fontSize={9}>
            {label}
          </text>
        )
      })}
    </svg>
  )
}

export default function MiniChart({ symbol, children }: Props) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const { data } = useQuery({
    queryKey: ['chart', symbol],
    queryFn: () => getChart(symbol, '3mo', '1d'),
    enabled: show,
    staleTime: 600 * 1000, // 10 min
    refetchOnWindowFocus: false,
  })

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPos({ x: rect.left, y: rect.bottom + 6 })
      }
      setShow(true)
    }, 300) // slight delay to avoid flicker
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShow(false)
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer"
      >
        {children}
      </span>
      {show && (
        <div
          className="fixed z-[200] rounded-xl bg-bg-card/98 border border-border-subtle shadow-2xl glass p-2 animate-fadeIn"
          style={{ left: pos.x, top: pos.y }}
          onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="text-xs text-t-muted px-1 mb-1 font-mono">{symbol} · 3个月</div>
          {data && data.candles.length > 0 ? (
            <CandleChart candles={data.candles} />
          ) : (
            <div className="w-[320px] h-[160px] flex items-center justify-center text-xs text-t-faint">
              {data ? '暂无数据' : '加载中...'}
            </div>
          )}
        </div>
      )}
    </>
  )
}
