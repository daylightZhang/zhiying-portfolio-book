from datetime import datetime
from pydantic import BaseModel


class AccountCreate(BaseModel):
    name: str


class AccountUpdate(BaseModel):
    name: str


class AccountResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
