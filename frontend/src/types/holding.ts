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
  linked_broker_holding_id: number | null
  broker_account_name: string | null
  broker_holding_symbol: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HoldingCreate {
  symbol: string
  name: string
  market: string
  quantity?: number
  cost_price?: number
  holding_ratio?: number
  contract_multiplier?: number
  margin_rate?: number
  currency?: string
  notes?: string
  transacted_at?: string
  linked_broker_holding_id?: number
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
  linked_broker_holding_id?: number
  unlink?: boolean
}

export interface BrokerPosition {
  id: number
  symbol: string
  name: string
  market: string
  quantity: number
  cost_price: number
  currency: string
  account_id: number
  account_name: string
}
