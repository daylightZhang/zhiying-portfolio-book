import { useState, useEffect } from 'react'
import { BellRing, X } from 'lucide-react'
import { useActiveReminders } from '../../hooks/useIPO'
import type { ActiveReminder } from '../../api/ipo'

function getTodayKey(): string {
  return `ipo_alerts_dismissed_${new Date().toISOString().slice(0, 10)}`
}

function getDismissedToday(): Set<string> {
  try {
    const raw = localStorage.getItem(getTodayKey())
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set()
}

function dismissSymbol(symbol: string) {
  const key = getTodayKey()
  const dismissed = getDismissedToday()
  dismissed.add(symbol)
  localStorage.setItem(key, JSON.stringify([...dismissed]))

  // Clean old keys
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('ipo_alerts_dismissed_') && k !== key) {
      localStorage.removeItem(k)
    }
  }
}

export default function IPOAlert() {
  const { data: activeReminders } = useActiveReminders()
  const [visibleAlerts, setVisibleAlerts] = useState<ActiveReminder[]>([])

  useEffect(() => {
    if (!activeReminders || activeReminders.length === 0) {
      setVisibleAlerts([])
      return
    }
    const dismissed = getDismissedToday()
    const newAlerts = activeReminders.filter(r => !dismissed.has(r.symbol))
    setVisibleAlerts(newAlerts)
  }, [activeReminders])

  const handleDismiss = (symbol: string) => {
    dismissSymbol(symbol)
    setVisibleAlerts(prev => prev.filter(a => a.symbol !== symbol))
  }

  if (visibleAlerts.length === 0) return null

  return (
    <div className="fixed top-4 left-4 z-[99] flex flex-col gap-2 max-w-sm">
      {visibleAlerts.map(alert => (
        <div
          key={alert.symbol}
          className="flex items-start gap-2.5 rounded-xl bg-bg-card/95 border border-yellow-500/40 px-4 py-3 shadow-xl glass animate-slideUp"
        >
          <BellRing size={16} className="text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-t-primary">
            <span className="font-mono font-medium text-accent">{alert.symbol}</span>
            {alert.name && <span className="ml-1.5 text-t-secondary">{alert.name}</span>}
            <div className="text-xs text-t-muted mt-0.5">
              {alert.days_until > 0
                ? `将于 ${alert.listing_date} 上市 (还有${alert.days_until}天)`
                : alert.days_until === 0
                  ? `今日上市 (${alert.listing_date})`
                  : `已于 ${alert.listing_date} 上市`
              }
            </div>
          </div>
          <button
            onClick={() => handleDismiss(alert.symbol)}
            className="text-t-faint hover:text-t-secondary shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
