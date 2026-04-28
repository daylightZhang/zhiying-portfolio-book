from datetime import datetime
from pydantic import BaseModel


class AccountCreate(BaseModel):
    name: str
    type: str = "portfolio"


class AccountUpdate(BaseModel):
    name: str


class AccountResponse(BaseModel):
    id: int
    name: str
    type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
