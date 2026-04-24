import { CURRENCY_SYMBOLS } from './constants'

const TZ = 'Asia/Shanghai'

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatCurrency(value: number, currency: string, decimals = 2): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  return `${symbol}${formatNumber(value, decimals)}`
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ })
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  })
}

export function timeAgo(dateStr: string): string {
  const now = new Date()
  const bjNow = new Date(now.toLocaleString('en-US', { timeZone: TZ }))
  const bjTarget = new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: TZ }))
  const diff = bjNow.getTime() - bjTarget.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
