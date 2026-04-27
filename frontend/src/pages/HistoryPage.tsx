import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTransactions, useRollbackTransaction } from '../hooks/useTransactions'
import { useToast } from '../hooks/useToast'
import { useHoldings } from '../hooks/useHoldings'
import TransactionList from '../components/transactions/TransactionList'
import CustomSelect from '../components/common/CustomSelect'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'

const TX_TYPES = [
  { value: '', label: '全部' },
  { value: 'BUY', label: '买入' },
  { value: 'SELL', label: '卖出' },
  { value: 'DEPOSIT', label: '入金' },
  { value: 'WITHDRAW', label: '出金' },
  { value: 'ADJUST', label: '调整' },
]

const PAGE_SIZE = 20

export default function HistoryPage() {
  const [holdingId, setHoldingId] = useState('')
  const [txType, setTxType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(0)

  const { showToast } = useToast()
  const rollbackMut = useRollbackTransaction()
  const { data: holdings } = useHoldings()
  const { data, isLoading } = useTransactions({
    holding_id: holdingId ? Number(holdingId) : undefined,
    type: txType || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const transactions = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const holdingOptions = [
    { value: '', label: '全部持仓' },
    ...(holdings?.map(h => ({ value: String(h.id), label: `${h.name} (${h.symbol})` })) || []),
  ]

  const resetPage = () => setPage(0)

  const inputClass = 'rounded-lg border border-border bg-input-bg px-2.5 py-1.5 text-xs text-t-primary outline-none focus:border-accent transition-colors'

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-t-primary">交易记录</h2>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <CustomSelect
          options={holdingOptions}
          value={holdingId}
          onChange={v => { setHoldingId(v); resetPage() }}
          placeholder="全部持仓"
          className="w-52"
        />

        <div className="flex gap-1">
          {TX_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => { setTxType(t.value); resetPage() }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                txType === t.value
                  ? 'bg-accent-bg text-accent'
                  : 'text-t-muted hover:bg-bg-hover hover:text-t-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); resetPage() }}
            className={inputClass}
          />
          <span className="text-xs text-t-faint">至</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); resetPage() }}
            className={inputClass}
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); resetPage() }}
              className="text-xs text-t-muted hover:text-accent transition-colors"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* Transactions */}
      {isLoading ? (
        <LoadingSpinner />
      ) : transactions.length === 0 ? (
        <EmptyState title="暂无交易记录" description="添加持仓后会自动生成交易记录" />
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
            <TransactionList transactions={transactions} onRollback={(txId) => {
              rollbackMut.mutate(txId, {
                onSuccess: () => showToast('回滚成功'),
                onError: () => showToast('回滚失败', 'error'),
              })
            }} />
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-t-muted">
            <span>共 {total} 条记录</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg p-1.5 hover:bg-bg-hover disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="tabular-nums">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg p-1.5 hover:bg-bg-hover disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
