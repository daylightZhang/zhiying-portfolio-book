from pydantic import BaseModel

from app.utils.ticker import BeijingDateTime


class AccountCreate(BaseModel):
    name: str
    type: str = "portfolio"


class AccountUpdate(BaseModel):
    name: str


class AccountResponse(BaseModel):
    id: int
    name: str
    type: str
    created_at: BeijingDateTime
    updated_at: BeijingDateTime

    model_config = {"from_attributes": True}
