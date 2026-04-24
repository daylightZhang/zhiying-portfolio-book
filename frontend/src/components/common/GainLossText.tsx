import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../utils/format'

interface Props {
  value: number
  percent?: number
  currency?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function GainLossText({ value, percent, currency, showIcon = true, size = 'md' }: Props) {
  const isGain = value > 0
  const isLoss = value < 0
  const isZero = value === 0

  const colorClass = isGain ? 'text-gain' : isLoss ? 'text-loss' : 'text-t-muted'
  const sizeClass = size === 'lg' ? 'text-2xl font-bold' : size === 'sm' ? 'text-sm' : 'text-base'
  const iconSize = size === 'lg' ? 20 : size === 'sm' ? 12 : 16

  return (
    <span className={`inline-flex items-center gap-1 ${colorClass} ${sizeClass}`}>
      {showIcon && !isZero && (
        isGain ? <TrendingUp size={iconSize} /> : <TrendingDown size={iconSize} />
      )}
      {showIcon && isZero && <Minus size={iconSize} />}
      <span>
        {currency ? formatCurrency(Math.abs(value), currency) : (value > 0 ? '+' : '') + value.toFixed(2)}
        {percent !== undefined && (
          <span className="ml-1">({formatPercent(percent)})</span>
        )}
      </span>
    </span>
  )
}
