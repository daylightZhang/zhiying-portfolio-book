from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    holding_id: int | None = None,
    type: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    txs = transaction_service.get_transactions(db, holding_id, type, limit, offset)
    result = []
    for tx in txs:
        data = TransactionResponse.model_validate(tx)
        if tx.holding:
            data.holding_name = tx.holding.name
            data.holding_symbol = tx.holding.symbol
        elif tx.type in ("DEPOSIT", "WITHDRAW"):
            data.holding_name = "现金"
            data.holding_symbol = tx.currency or ""
        result.append(data)
    return result


@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    tx = transaction_service.create_transaction(db, data)
    if not tx:
        raise HTTPException(status_code=404, detail="Holding not found")
    resp = TransactionResponse.model_validate(tx)
    if tx.holding:
        resp.holding_name = tx.holding.name
        resp.holding_symbol = tx.holding.symbol
    return resp
