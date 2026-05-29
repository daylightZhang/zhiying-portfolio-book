import client from './client'
import type { Transaction, TransactionCreate, TransactionUpdate } from '../types/transaction'

export interface TransactionPage {
  items: Transaction[]
  total: number
}

export async function getTransactions(params?: {
  holding_id?: number
  type?: string
  limit?: number
  offset?: number
  account_id?: number
  start_date?: string
  end_date?: string
}): Promise<TransactionPage> {
  const resp = await client.get('/transactions', { params })
  return {
    items: resp.data,
    total: parseInt(resp.headers['x-total-count'] || '0', 10),
  }
}

export async function createTransaction(payload: TransactionCreate, accountId: number = 1): Promise<Transaction> {
  const { data } = await client.post('/transactions', payload, { params: { account_id: accountId } })
  return data
}

export async function updateTransaction(txId: number, payload: TransactionUpdate, accountId: number = 1): Promise<Transaction> {
  const { data } = await client.put(`/transactions/${txId}`, payload, { params: { account_id: accountId } })
  return data
}

export async function deleteTransaction(txId: number, accountId: number = 1): Promise<void> {
  await client.delete(`/transactions/${txId}`, { params: { account_id: accountId } })
}
