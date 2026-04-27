from datetime import datetime
from pydantic import BaseModel

from app.utils.ticker import Market, Currency


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
    price_updated_at: datetime | None


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
    cash_balances: dict[str, float]
    holdings: list[HoldingSummary]
    by_market: dict[str, MarketBreakdown]
    by_currency: dict[str, MarketBreakdown]
    exchange_rates: dict[str, float]
    last_refreshed: datetime | None


class ExchangeRateResponse(BaseModel):
    from_currency: str
    to_currency: str
    rate: float
    updated_at: datetime

    model_config = {"from_attributes": True}
