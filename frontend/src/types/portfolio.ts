export interface HoldingSummary {
  id: number
  symbol: string
  name: string
  market: string
  quantity: number
  cost_price: number
  holding_ratio: number
  contract_multiplier: number
  margin_rate: number
  current_price: number | null
  currency: string
  market_value: number
  market_value_base: number
  cost_total: number
  gain_loss: number
  gain_loss_pct: number
  weight_pct: number
  price_updated_at: string | null
  linked_broker_holding_id: number | null
  broker_account_name: string | null
}

export interface RealizedPnlItem {
  holding_id: number
  symbol: string
  name: string
  currency: string
  realized_pnl_native: number
  realized_pnl_base: number
  source: 'own' | 'linked'
}

export interface MarketBreakdown {
  value: number
  weight_pct: number
}

export interface PortfolioSummary {
  base_currency: string
  total_market_value: number
  total_cost: number
  total_gain_loss: number
  total_gain_loss_pct: number
  total_realized_pnl: number
  total_cash: number
  cash_balances: Record<string, number>
  holdings: HoldingSummary[]
  realized_pnl_details: RealizedPnlItem[]
  by_market: Record<string, MarketBreakdown>
  by_currency: Record<string, MarketBreakdown>
  exchange_rates: Record<string, number>
  last_refreshed: string | null
}
