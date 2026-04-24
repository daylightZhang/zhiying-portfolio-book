from datetime import datetime
from pydantic import BaseModel
import enum


class TransactionType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"
    ADJUST = "ADJUST"
    DEPOSIT = "DEPOSIT"
    WITHDRAW = "WITHDRAW"


class TransactionCreate(BaseModel):
    holding_id: int | None = None
    type: TransactionType
    quantity: float
    price: float
    currency: str | None = None
    notes: str | None = None
    transacted_at: datetime


class TransactionResponse(BaseModel):
    id: int
    holding_id: int | None
    type: str
    quantity: float
    price: float
    total_amount: float
    currency: str | None = None
    notes: str | None
    transacted_at: datetime
    created_at: datetime
    holding_name: str | None = None
    holding_symbol: str | None = None

    model_config = {"from_attributes": True}
