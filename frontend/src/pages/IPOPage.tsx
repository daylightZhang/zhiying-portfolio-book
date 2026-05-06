import { useState } from 'react'
import { RefreshCw, Bell, BellRing } from 'lucide-react'
import { useIPOList, useIPOReminders, useAddReminder, useRemoveReminder } from '../hooks/useIPO'
import { useToast } from '../hooks/useToast'
import type { IPOItem } from '../api/ipo'

export default function IPOPage() {
  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useIPOList()
  const { data: reminders } = useIPOReminders()
  const addReminder = useAddReminder()
  const removeReminder = useRemoveReminder()
  const { showToast } = useToast()
  const [tab, setTab] = useState<'listed' | 'upcoming'>('listed')

  const reminderSymbols = new Set(reminders?.map(r => r.symbol) || [])

  const items: IPOItem[] = tab === 'listed'
    ? (data?.listed || [])
    : (data?.upcoming || [])

  const handleToggleReminder = (item: IPOItem) => {
    if (reminderSymbols.has(item.symbol)) {
      removeReminder.mutate(item.symbol, {
        onSuccess: () => showToast(`已取消 ${item.symbol} 提醒`, 'success'),
        onError: () => showToast('取消提醒失败', 'error'),
      })
    } else {
      addReminder.mutate(
        { symbol: item.symbol, name: item.name, listing_date: item.listing_date },
        {
          onSuccess: () => showToast(`已设置 ${item.symbol} 上市提醒`, 'success'),
          onError: () => showToast('设置提醒失败', 'error'),
        },
      )
    }
  }

  const formatUpdateTime = () => {
    if (!data?.updated_at) return ''
    return data.updated_at
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-t-primary">美股IPO</h1>
          <p className="text-xs text-t-muted mt-0.5">
            数据来源: moomoo.com
            {formatUpdateTime() && ` · 更新于 ${formatUpdateTime()}`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-sm hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? '刷新中...' : '刷新'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-subtle">
        <button
          onClick={() => setTab('listed')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'listed'
              ? 'border-accent text-accent'
              : 'border-transparent text-t-muted hover:text-t-secondary'
          }`}
        >
          已上市
        </button>
        <button
          onClick={() => setTab('upcoming')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'upcoming'
              ? 'border-accent text-accent'
              : 'border-transparent text-t-muted hover:text-t-secondary'
          }`}
        >
          待上市
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-t-muted">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-t-muted">
          {tab === 'upcoming' ? '暂无待上市新股' : '暂无数据'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-card/60 text-t-muted text-left">
                <th className="px-3 py-2.5 font-medium">代码</th>
                <th className="px-3 py-2.5 font-medium">股票名称</th>
                <th className="px-3 py-2.5 font-medium">上市日期</th>
                <th className="px-3 py-2.5 font-medium text-right">价格</th>
                <th className="px-3 py-2.5 font-medium text-right">发行价</th>
                <th className="px-3 py-2.5 font-medium text-right">首日涨幅</th>
                <th className="px-3 py-2.5 font-medium text-right">累计涨幅</th>
                <th className="px-3 py-2.5 font-medium">行业</th>
                <th className="px-3 py-2.5 font-medium text-center">提醒</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.map((item) => {
                const hasReminder = reminderSymbols.has(item.symbol)
                const changeColor = (val: string) => {
                  if (val.startsWith('+')) return 'text-gain'
                  if (val.startsWith('-')) return 'text-loss'
                  return 'text-t-secondary'
                }
                return (
                  <tr
                    key={item.symbol + item.listing_date}
                    className="hover:bg-bg-card/40 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-mono text-accent font-medium">
                      {item.symbol}
                    </td>
                    <td className="px-3 py-2.5 text-t-primary max-w-[200px] truncate">
                      {item.name}
                    </td>
                    <td className="px-3 py-2.5 text-t-secondary tabular-nums">
                      {item.listing_date}
                    </td>
                    <td className="px-3 py-2.5 text-right text-t-primary tabular-nums">
                      {item.price}
                    </td>
                    <td className="px-3 py-2.5 text-right text-t-secondary tabular-nums">
                      {item.ipo_price}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${changeColor(item.first_day_change)}`}>
                      {item.first_day_change}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${changeColor(item.cumulative_change)}`}>
                      {item.cumulative_change}
                    </td>
                    <td className="px-3 py-2.5 text-t-muted text-xs">
                      {item.industry}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => handleToggleReminder(item)}
                        className={`p-1 rounded transition-colors ${
                          hasReminder
                            ? 'text-yellow-400 hover:text-yellow-300'
                            : 'text-t-faint hover:text-t-secondary'
                        }`}
                        title={hasReminder ? '取消提醒' : '设置上市提醒'}
                      >
                        {hasReminder ? <BellRing size={16} /> : <Bell size={16} />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
