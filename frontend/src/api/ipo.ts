import client from './client'

export interface IPOItem {
  symbol: string
  name: string
  listing_date: string
  price: string
  ipo_price: string
  first_day_change: string
  cumulative_change: string
  market_cap: string
  industry: string
  status: 'listed' | 'upcoming'
}

export interface IPOListResponse {
  listed: IPOItem[]
  upcoming: IPOItem[]
  updated_at: string | null
}

export interface IPOReminder {
  symbol: string
  name: string | null
  listing_date: string
}

export interface ActiveReminder {
  symbol: string
  name: string | null
  listing_date: string
  days_until: number
}

export async function getIPOList(): Promise<IPOListResponse> {
  const { data } = await client.get('/ipo/list')
  return data
}

export async function getIPOReminders(): Promise<IPOReminder[]> {
  const { data } = await client.get('/ipo/reminders')
  return data
}

export async function addIPOReminder(reminder: { symbol: string; name?: string; listing_date: string }): Promise<void> {
  await client.post('/ipo/reminders', reminder)
}

export async function removeIPOReminder(symbol: string): Promise<void> {
  await client.delete(`/ipo/reminders/${symbol}`)
}

export async function getActiveReminders(): Promise<ActiveReminder[]> {
  const { data } = await client.get('/ipo/reminders/active')
  return data
}
