import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/portfolio'
import { useCurrentAccount } from './useAccount'

export function useDeposit() {
  const qc = useQueryClient()
  const { accountId } = useCurrentAccount()
  return useMutation({
    mutationFn: ({ currency, amount, notes }: { currency: string; amount: number; notes?: string }) =>
      api.deposit(currency, amount, notes, accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useWithdraw() {
  const qc = useQueryClient()
  const { accountId } = useCurrentAccount()
  return useMutation({
    mutationFn: ({ currency, amount, notes }: { currency: string; amount: number; notes?: string }) =>
      api.withdraw(currency, amount, notes, accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
