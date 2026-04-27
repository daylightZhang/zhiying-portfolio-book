import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useFlashNews } from '../hooks/useNews'
import { formatDateTime } from '../utils/format'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import type { FlashItem } from '../api/news'

const CHANNELS = [
  { value: 0, label: '全部' },
  { value: 1, label: '快讯' },
  { value: 3, label: 'A股' },
  { value: 2, label: '期货' },
  { value: 4, label: '数据' },
]

function extractTime(timeStr: string) {
  const parts = timeStr.split(' ')
  return parts.length > 1 ? parts[1] : timeStr
}

function FlashContent({ item }: { item: FlashItem }) {
  // Economic data release (type=1)
  if (item.type === 1 && item.data.name) {
    const d = item.data
    return (
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-xs font-medium text-accent bg-accent-bg rounded px-1.5 py-0.5">{d.country}</span>
        <span className="text-t-primary font-medium">{d.name}</span>
        <span className="text-t-secondary">
          实际 <span className="font-semibold text-t-primary">{d.actual}{d.unit}</span>
        </span>
        {d.previous && <span className="text-t-faint">前值 {d.previous}{d.unit}</span>}
        {d.consensus && <span className="text-t-faint">预期 {d.consensus}{d.unit}</span>}
      </div>
    )
  }

  // Article link (type=2)
  if (item.type === 2 && item.data.link) {
    return (
      <div>
        {item.data.title && <div className="text-xs text-accent mb-0.5">{item.data.tag || '精选分析'}</div>}
        <a href={item.data.link} target="_blank" rel="noopener noreferrer" className="text-t-primary hover:text-accent transition-colors">
          {item.data.title || item.data.content}
        </a>
        {item.data.content && item.data.title && (
          <p className="text-xs text-t-muted mt-1" dangerouslySetInnerHTML={{ __html: item.data.content }} />
        )}
      </div>
    )
  }

  // Regular flash (type=0)
  const content = item.data.content || ''
  return <div className="text-t-primary text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
}

export default function NewsPage() {
  const { data: items, isLoading, dataUpdatedAt, refetch, isFetching } = useFlashNews()
  const [channel, setChannel] = useState(0)

  const filtered = items?.filter(item => {
    if (channel === 0) return true
    return item.channel?.includes(channel)
  }) || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-t-primary">实时资讯</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-t-faint">
            数据来源: 金十数据
            {dataUpdatedAt ? ` · 更新于 ${formatDateTime(new Date(dataUpdatedAt).toISOString())}` : ''}
          </span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-lg bg-bg-hover px-3 py-1.5 text-xs text-t-secondary hover:opacity-80 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* Channel Filter */}
      <div className="flex gap-1">
        {CHANNELS.map(c => (
          <button
            key={c.value}
            onClick={() => setChannel(c.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              channel === c.value
                ? 'bg-accent-bg text-accent'
                : 'text-t-muted hover:bg-bg-hover hover:text-t-secondary'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Flash Feed */}
      {isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="暂无快讯" description="稍后再来查看" />
      ) : (
        <div className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
          <div className="divide-y divide-border-subtle">
            {filtered.map(item => (
              <div key={item.id} className={`px-4 py-3 hover:bg-bg-hover/50 transition-colors ${item.important ? 'bg-accent-bg/30' : ''}`}>
                <div className="flex gap-3">
                  {/* Time column */}
                  <div className="shrink-0 w-16 pt-0.5">
                    <span className="text-xs text-t-faint tabular-nums">{extractTime(item.time)}</span>
                  </div>
                  {/* Indicator */}
                  <div className="shrink-0 pt-2">
                    <div className={`w-2 h-2 rounded-full ${item.important ? 'bg-loss' : 'bg-border'}`} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <FlashContent item={item} />
                    {item.data.source && (
                      <span className="text-xs text-t-faint mt-1 inline-block">— {item.data.source}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
