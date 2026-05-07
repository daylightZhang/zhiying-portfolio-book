import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as txApi from '../api/transactions'
import type { TransactionCreate } from '../types/transaction'
import { useCurrentAccount } from './useAccount'

export function useTransactions(params?: {
  holding_id?: number
  type?: string
  limit?: number
  offset?: number
  start_date?: string
  end_date?: string
}) {
  const { accountId } = useCurrentAccount()
  return useQuery({
    queryKey: ['transactions', accountId, params],
    queryFn: () => txApi.getTransactions({ ...params, account_id: accountId }),
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  const { accountId } = useCurrentAccount()
  return useMutation({
    mutationFn: (data: TransactionCreate) => txApi.createTransaction(data, accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['holdings'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  const { accountId } = useCurrentAccount()
  return useMutation({
    mutationFn: (txId: number) => txApi.deleteTransaction(txId, accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['holdings'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}
