from pydantic import BaseModel

from app.utils.ticker import BeijingDateTime


class CashBalanceResponse(BaseModel):
    currency: str
    balance: float
    updated_at: BeijingDateTime

    model_config = {"from_attributes": True}


class CashOperationCreate(BaseModel):
    currency: str
    amount: float
    notes: str | None = None
