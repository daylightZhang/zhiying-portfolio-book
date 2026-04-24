from datetime import datetime
from pydantic import BaseModel


class CashBalanceResponse(BaseModel):
    currency: str
    balance: float
    updated_at: datetime

    model_config = {"from_attributes": True}


class CashOperationCreate(BaseModel):
    currency: str
    amount: float
    notes: str | None = None
