from datetime import datetime
from pydantic import BaseModel

from app.utils.ticker import Market, Currency


class HoldingCreate(BaseModel):
    symbol: str
    name: str
    market: Market
    quantity: float
    cost_price: float
    holding_ratio: float = 1.0
    contract_multiplier: float = 1.0
    currency: Currency | None = None
    notes: str | None = None
    transacted_at: datetime | None = None


class HoldingUpdate(BaseModel):
    name: str | None = None
    quantity: float | None = None
    cost_price: float | None = None
    holding_ratio: float | None = None
    contract_multiplier: float | None = None
    notes: str | None = None


class HoldingResponse(BaseModel):
    id: int
    symbol: str
    name: str
    market: str
    quantity: float
    cost_price: float
    holding_ratio: float
    contract_multiplier: float
    currency: str
    current_price: float | None
    price_updated_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
