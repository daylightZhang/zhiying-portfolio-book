import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Wallet } from 'lucide-react'
import { formatCurrency } from '../../utils/format'
import { CURRENCY_SYMBOLS } from '../../utils/constants'
import CashDialog from './CashDialog'
import { useDeposit, useWithdraw } from '../../hooks/useCash'
import { useToast } from '../../hooks/useToast'

interface Props {
  cashBalances: Record<string, number>
  totalCash: number
  baseCurrency: string
}

export default function CashPanel({ cashBalances, totalCash, baseCurrency }: Props) {
  const [dialogMode, setDialogMode] = useState<'deposit' | 'withdraw' | null>(null)
  const { showToast } = useToast()
  const depositMut = useDeposit()
  const withdrawMut = useWithdraw()

  const entries = Object.entries(cashBalances).filter(([, v]) => v !== 0)

  return (
    <div className="rounded-2xl bg-bg-card p-5 border border-border-subtle card-hover">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-t-muted" />
          <h3 className="text-sm font-medium text-t-muted">现金余额</h3>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setDialogMode('deposit')}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-accent bg-accent-bg hover:opacity-80 transition-all duration-200"
          >
            <ArrowDownToLine size={12} />入金
          </button>
          <button
            onClick={() => setDialogMode('withdraw')}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-orange-500 bg-orange-500/10 hover:opacity-80 transition-all duration-200"
          >
            <ArrowUpFromLine size={12} />出金
          </button>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map(([cur, balance]) => (
            <div key={cur} className="flex items-center justify-between text-sm">
              <span className="text-t-secondary">{CURRENCY_SYMBOLS[cur] || cur} {cur}</span>
              <span className={`font-medium ${balance >= 0 ? 'text-t-primary' : 'text-gain'}`}>
                {formatCurrency(balance, cur)}
              </span>
            </div>
          ))}
          <div className="border-t border-border-subtle pt-2 flex items-center justify-between text-sm">
            <span className="text-t-muted">折合 {baseCurrency}</span>
            <span className="font-medium text-t-primary">{formatCurrency(totalCash, baseCurrency)}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-t-faint">暂无现金，点击入金开始</p>
      )}

      <CashDialog
        open={!!dialogMode}
        mode={dialogMode || 'deposit'}
        onClose={() => setDialogMode(null)}
        onSubmit={(currency, amount, notes) => {
          const isDeposit = dialogMode === 'deposit'
          const mut = isDeposit ? depositMut : withdrawMut
          mut.mutate({ currency, amount, notes }, {
            onSuccess: () => showToast(isDeposit ? '入金成功' : '出金成功'),
            onError: () => showToast(isDeposit ? '入金失败' : '出金失败', 'error'),
          })
        }}
      />
    </div>
  )
}
