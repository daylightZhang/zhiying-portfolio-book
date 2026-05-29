export interface Transaction {
  id: number
  holding_id: number
  type: 'BUY' | 'SELL' | 'ADJUST'
  quantity: number
  price: number
  total_amount: number
  notes: string | null
  transacted_at: string
  created_at: string
  holding_name: string | null
  holding_symbol: string | null
}

export interface TransactionCreate {
  holding_id: number
  type: 'BUY' | 'SELL' | 'ADJUST'
  quantity: number
  price: number
  notes?: string
  transacted_at: string
}

export interface TransactionUpdate {
  transacted_at?: string
  notes?: string
}
