import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
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

export default function HistoryPage() {
  const [holdingId, setHoldingId] = useState('')
  const [txType, setTxType] = useState('')

  const { data: holdings } = useHoldings()
  const { data: transactions, isLoading } = useTransactions({
    holding_id: holdingId ? Number(holdingId) : undefined,
    type: txType || undefined,
    limit: 100,
  })

  const holdingOptions = [
    { value: '', label: '全部持仓' },
    ...(holdings?.map(h => ({ value: String(h.id), label: `${h.name} (${h.symbol})` })) || []),
  ]

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-t-primary">交易记录</h2>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <CustomSelect
          options={holdingOptions}
          value={holdingId}
          onChange={setHoldingId}
          placeholder="全部持仓"
          className="w-52"
        />

        <div className="flex gap-1">
          {TX_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setTxType(t.value)}
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
      </div>

      {/* Transactions */}
      {isLoading ? (
        <LoadingSpinner />
      ) : !transactions || transactions.length === 0 ? (
        <EmptyState title="暂无交易记录" description="添加持仓后会自动生成交易记录" />
      ) : (
        <div className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
          <TransactionList transactions={transactions} />
        </div>
      )}
    </div>
  )
}
