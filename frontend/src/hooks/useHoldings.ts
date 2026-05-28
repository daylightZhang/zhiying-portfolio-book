import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as holdingsApi from '../api/holdings'
import type { HoldingCreate, HoldingUpdate } from '../types/holding'
import { useCurrentAccount } from './useAccount'

export function useHoldings(market?: string) {
  const { accountId } = useCurrentAccount()
  return useQuery({
    queryKey: ['holdings', accountId, market],
    queryFn: () => holdingsApi.getHoldings(market, accountId),
  })
}

export function useCreateHolding() {
  const qc = useQueryClient()
  const { accountId } = useCurrentAccount()
  return useMutation({
    mutationFn: (data: HoldingCreate) => holdingsApi.createHolding(data, accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['broker-positions'] })
    },
  })
}

export function useUpdateHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: HoldingUpdate }) => holdingsApi.updateHolding(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['broker-positions'] })
    },
  })
}

export function useDeleteHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => holdingsApi.deleteHolding(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['broker-positions'] })
    },
  })
}

export function useBrokerPositions() {
  return useQuery({
    queryKey: ['broker-positions'],
    queryFn: holdingsApi.getBrokerPositions,
  })
}
