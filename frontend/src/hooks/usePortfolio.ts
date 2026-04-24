import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import * as portfolioApi from '../api/portfolio'

const CURRENCY_KEY = 'zhiying_base_currency'

export function useBaseCurrency() {
  const [currency, setCurrency] = useState(() => localStorage.getItem(CURRENCY_KEY) || 'CNY')

  useEffect(() => {
    localStorage.setItem(CURRENCY_KEY, currency)
  }, [currency])

  return [currency, setCurrency] as const
}

export function usePortfolioSummary(baseCurrency: string) {
  return useQuery({
    queryKey: ['portfolio', 'summary', baseCurrency],
    queryFn: () => portfolioApi.getPortfolioSummary(baseCurrency),
  })
}

export function useRefreshPrices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: portfolioApi.refreshPrices,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['holdings'] })
    },
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
