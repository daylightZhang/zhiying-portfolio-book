import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as txApi from '../api/transactions'
import type { TransactionCreate } from '../types/transaction'

export function useTransactions(params?: {
  holding_id?: number
  type?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => txApi.getTransactions(params),
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TransactionCreate) => txApi.createTransaction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['holdings'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}
