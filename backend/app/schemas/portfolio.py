from datetime import datetime
from pydantic import BaseModel

from app.utils.ticker import Market, Currency, BeijingDateTime


class HoldingSummary(BaseModel):
    id: int
    symbol: str
    name: str
    market: str
    quantity: float
    cost_price: float
    holding_ratio: float
    contract_multiplier: float
    margin_rate: float
    current_price: float | None
    currency: str
    market_value: float
    market_value_base: float
    cost_total: float
    gain_loss: float
    gain_loss_pct: float
    weight_pct: float
    price_updated_at: BeijingDateTime | None
    linked_broker_holding_id: int | None = None
    broker_account_name: str | None = None


class RealizedPnlItem(BaseModel):
    holding_id: int
    symbol: str
    name: str
    currency: str
    realized_pnl_native: float
    realized_pnl_base: float
    source: str = "own"  # "own" | "linked"


class MarketBreakdown(BaseModel):
    value: float
    weight_pct: float


class PortfolioSummary(BaseModel):
    base_currency: str
    total_market_value: float
    total_cost: float
    total_gain_loss: float
    total_gain_loss_pct: float
    total_realized_pnl: float
    total_cash: float
    futures_margin: float = 0.0
    cash_balances: dict[str, float]
    holdings: list[HoldingSummary]
    realized_pnl_details: list[RealizedPnlItem] = []
    by_market: dict[str, MarketBreakdown]
    by_currency: dict[str, MarketBreakdown]
    exchange_rates: dict[str, float]
    last_refreshed: BeijingDateTime | None


class ExchangeRateResponse(BaseModel):
    from_currency: str
    to_currency: str
    rate: float
    updated_at: BeijingDateTime

    model_config = {"from_attributes": True}
