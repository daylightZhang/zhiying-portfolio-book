import client from './client'
import type { Transaction, TransactionCreate } from '../types/transaction'

export async function getTransactions(params?: {
  holding_id?: number
  type?: string
  limit?: number
  offset?: number
  account_id?: number
}): Promise<Transaction[]> {
  const { data } = await client.get('/transactions', { params })
  return data
}

export async function createTransaction(payload: TransactionCreate, accountId: number = 1): Promise<Transaction> {
  const { data } = await client.post('/transactions', payload, { params: { account_id: accountId } })
  return data
}
