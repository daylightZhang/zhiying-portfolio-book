export interface Holding {
  id: number
  symbol: string
  name: string
  market: string
  quantity: number
  cost_price: number
  holding_ratio: number
  contract_multiplier: number
  margin_rate: number
  currency: string
  current_price: number | null
  price_updated_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HoldingCreate {
  symbol: string
  name: string
  market: string
  quantity: number
  cost_price: number
  holding_ratio?: number
  contract_multiplier?: number
  margin_rate?: number
  currency?: string
  notes?: string
  transacted_at?: string
}

export interface HoldingUpdate {
  symbol?: string
  name?: string
  quantity?: number
  cost_price?: number
  holding_ratio?: number
  contract_multiplier?: number
  margin_rate?: number
  notes?: string
}
