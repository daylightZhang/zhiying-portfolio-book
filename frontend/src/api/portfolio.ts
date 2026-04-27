import client from './client'
import type { PortfolioSummary } from '../types/portfolio'

export async function getPortfolioSummary(baseCurrency: string, accountId: number = 1): Promise<PortfolioSummary> {
  const { data } = await client.get('/portfolio/summary', {
    params: { base_currency: baseCurrency, account_id: accountId },
  })
  return data
}

export async function refreshPrices(accountId: number = 1): Promise<Record<string, unknown>> {
  const { data } = await client.post('/market-data/refresh', null, { params: { account_id: accountId } })
  return data
}

export async function refreshExchangeRates(): Promise<unknown[]> {
  const { data } = await client.post('/portfolio/exchange-rates/refresh')
  return data
}

export interface CashBalance {
  currency: string
  balance: number
  updated_at: string
}

export async function getCashBalances(accountId: number = 1): Promise<CashBalance[]> {
  const { data } = await client.get('/cash', { params: { account_id: accountId } })
  return data
}

export async function deposit(currency: string, amount: number, notes?: string, accountId: number = 1): Promise<CashBalance> {
  const { data } = await client.post('/cash/deposit', { currency, amount, notes }, { params: { account_id: accountId } })
  return data
}

export async function withdraw(currency: string, amount: number, notes?: string, accountId: number = 1): Promise<CashBalance> {
  const { data } = await client.post('/cash/withdraw', { currency, amount, notes }, { params: { account_id: accountId } })
  return data
}
