import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import * as portfolioApi from '../api/portfolio'
import { useCurrentAccount } from './useAccount'

const CURRENCY_KEY = 'zhiying_base_currency'

export function useBaseCurrency() {
  const [currency, setCurrency] = useState(() => localStorage.getItem(CURRENCY_KEY) || 'CNY')

  useEffect(() => {
    localStorage.setItem(CURRENCY_KEY, currency)
  }, [currency])

  return [currency, setCurrency] as const
}

export function usePortfolioSummary(baseCurrency: string, realizedStart?: string, realizedEnd?: string) {
  const { accountId } = useCurrentAccount()
  return useQuery({
    queryKey: ['portfolio', 'summary', accountId, baseCurrency, realizedStart || '', realizedEnd || ''],
    queryFn: () => portfolioApi.getPortfolioSummary(baseCurrency, accountId, realizedStart, realizedEnd),
    refetchInterval: 5000,
  })
}

export function useRefreshPrices() {
  const qc = useQueryClient()
  const { accountId } = useCurrentAccount()
  return useMutation({
    mutationFn: () => portfolioApi.refreshPrices(accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['holdings'] })
    },
  })
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: portfolioApi.getExchangeRates,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRefreshExchangeRates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: portfolioApi.refreshExchangeRates,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}
