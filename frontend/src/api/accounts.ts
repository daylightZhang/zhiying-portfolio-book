import client from './client'

export interface Account {
  id: number
  name: string
  type: 'portfolio' | 'broker'
  created_at: string
  updated_at: string
}

export async function getAccounts(): Promise<Account[]> {
  const { data } = await client.get('/accounts')
  return data
}

export async function createAccount(name: string, type: string = 'portfolio'): Promise<Account> {
  const { data } = await client.post('/accounts', { name, type })
  return data
}

export async function updateAccount(id: number, name: string): Promise<Account> {
  const { data } = await client.put(`/accounts/${id}`, { name })
  return data
}

export async function deleteAccount(id: number): Promise<void> {
  await client.delete(`/accounts/${id}`)
}
