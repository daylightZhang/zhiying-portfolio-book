import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as holdingsApi from '../api/holdings'
import type { HoldingCreate, HoldingUpdate } from '../types/holding'

export function useHoldings(market?: string) {
  return useQuery({
    queryKey: ['holdings', market],
    queryFn: () => holdingsApi.getHoldings(market),
  })
}

export function useCreateHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: HoldingCreate) => holdingsApi.createHolding(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
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
    },
  })
}
