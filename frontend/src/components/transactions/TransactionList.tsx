import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Transaction } from '../../types/transaction'
import { formatNumber, formatDateTime } from '../../utils/format'
import ConfirmDialog from '../common/ConfirmDialog'

const TYPE_STYLES: Record<string, string> = {
  BUY: 'bg-blue-500/20 text-blue-600',
  SELL: 'bg-orange-500/20 text-orange-600',
  ADJUST: 'bg-gray-500/15 text-t-muted',
  DEPOSIT: 'bg-emerald-500/20 text-emerald-600',
  WITHDRAW: 'bg-amber-500/20 text-amber-600',
}

const TYPE_LABELS: Record<string, string> = {
  BUY: '买入',
  SELL: '卖出',
  ADJUST: '调整',
  DEPOSIT: '入金',
  WITHDRAW: '出金',
}

interface Props {
  transactions: Transaction[]
  onDelete?: (txId: number) => void
}

export default function TransactionList({ transactions, onDelete }: Props) {
  const [confirmId, setConfirmId] = useState<number | null>(null)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-t-faint uppercase tracking-wider">
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">持仓</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3 text-right">数量</th>
              <th className="px-4 py-3 text-right">价格</th>
              <th className="px-4 py-3 text-right">金额</th>
              <th className="px-4 py-3">备注</th>
              {onDelete && <th className="px-4 py-3 text-right">操作</th>}
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="border-b border-border-subtle hover:bg-bg-hover/50 transition-colors">
                <td className="px-4 py-3 text-t-muted whitespace-nowrap">{formatDateTime(tx.transacted_at)}</td>
                <td className="px-4 py-3">
                  <span className="text-t-primary">{tx.holding_name || '—'}</span>
                  {tx.holding_symbol && <span className="ml-1 text-xs text-t-faint">{tx.holding_symbol}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[tx.type]}`}>
                    {TYPE_LABELS[tx.type] || tx.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-t-secondary">{formatNumber(tx.quantity, 0)}</td>
                <td className="px-4 py-3 text-right text-t-secondary">{formatNumber(tx.price)}</td>
                <td className="px-4 py-3 text-right text-t-primary">{formatNumber(tx.total_amount)}</td>
                <td className="px-4 py-3 text-t-faint max-w-[150px] truncate">{tx.notes || '—'}</td>
                {onDelete && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setConfirmId(tx.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-t-muted hover:text-loss hover:bg-loss/10 transition-all"
                      title="删除此记录"
                    >
                      <Trash2 size={13} />
                      删除
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        title="删除交易记录"
        message="删除后将还原该交易对持仓和现金的影响，此操作不可恢复。"
        onConfirm={() => { if (confirmId !== null) { onDelete?.(confirmId); setConfirmId(null) } }}
        onCancel={() => setConfirmId(null)}
      />
    </>
  )
}
