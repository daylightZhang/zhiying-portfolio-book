import client from './client'
import type { Holding, HoldingCreate, HoldingUpdate } from '../types/holding'

export async function getHoldings(market?: string): Promise<Holding[]> {
  const params = market ? { market } : {}
  const { data } = await client.get('/holdings', { params })
  return data
}

export async function getHolding(id: number): Promise<Holding> {
  const { data } = await client.get(`/holdings/${id}`)
  return data
}

export async function createHolding(payload: HoldingCreate): Promise<Holding> {
  const { data } = await client.post('/holdings', payload)
  return data
}

export async function updateHolding(id: number, payload: HoldingUpdate): Promise<Holding> {
  const { data } = await client.put(`/holdings/${id}`, payload)
  return data
}

export async function deleteHolding(id: number): Promise<void> {
  await client.delete(`/holdings/${id}`)
}
