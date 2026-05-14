import { useQuery } from '@tanstack/react-query'
import client from '../api/client'

export interface MarketIndex {
  symbol: string
  name: string
  price: number
  change: number
  change_pct: number
}

async function fetchIndices(): Promise<MarketIndex[]> {
  const { data } = await client.get('/market-data/indices')
  return data
}

export function useMarketIndices() {
  return useQuery({
    queryKey: ['market-indices'],
    queryFn: fetchIndices,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  })
}
