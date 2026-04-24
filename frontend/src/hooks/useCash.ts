import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/portfolio'

export function useDeposit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ currency, amount, notes }: { currency: string; amount: number; notes?: string }) =>
      api.deposit(currency, amount, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useWithdraw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ currency, amount, notes }: { currency: string; amount: number; notes?: string }) =>
      api.withdraw(currency, amount, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
