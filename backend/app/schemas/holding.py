from datetime import datetime
from pydantic import BaseModel

from app.utils.ticker import Market, Currency, BeijingDateTime


class HoldingCreate(BaseModel):
    symbol: str
    name: str
    market: Market
    quantity: float = 0
    cost_price: float = 0
    holding_ratio: float = 1.0
    contract_multiplier: float = 1.0
    margin_rate: float = 0.0
    currency: Currency | None = None
    notes: str | None = None
    transacted_at: datetime | None = None
    linked_broker_holding_id: int | None = None


class HoldingUpdate(BaseModel):
    symbol: str | None = None
    name: str | None = None
    quantity: float | None = None
    cost_price: float | None = None
    holding_ratio: float | None = None
    contract_multiplier: float | None = None
    margin_rate: float | None = None
    notes: str | None = None
    linked_broker_holding_id: int | None = None
    unlink: bool = False


class HoldingResponse(BaseModel):
    id: int
    symbol: str
    name: str
    market: str
    quantity: float
    cost_price: float
    holding_ratio: float
    contract_multiplier: float
    margin_rate: float
    currency: str
    current_price: float | None
    price_updated_at: BeijingDateTime | None
    linked_broker_holding_id: int | None = None
    broker_account_name: str | None = None
    broker_holding_symbol: str | None = None
    notes: str | None
    created_at: BeijingDateTime
    updated_at: BeijingDateTime

    model_config = {"from_attributes": True}
