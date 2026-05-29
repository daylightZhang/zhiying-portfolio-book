from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionResponse, TransactionUpdate
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    holding_id: int | None = None,
    type: str | None = None,
    limit: int = 20,
    offset: int = 0,
    account_id: int = Query(default=1),
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db),
):
    txs = transaction_service.get_transactions(db, holding_id, type, limit, offset, account_id, start_date, end_date)
    total = transaction_service.count_transactions(db, holding_id, type, account_id, start_date, end_date)
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
    # Return total in header for pagination
    response = JSONResponse(content=[r.model_dump(mode="json") for r in result])
    response.headers["X-Total-Count"] = str(total)
    return response


@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(tx_id: int, data: TransactionUpdate, account_id: int = Query(default=1), db: Session = Depends(get_db)):
    tx = transaction_service.update_transaction(db, tx_id, data, account_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    resp = TransactionResponse.model_validate(tx)
    if tx.holding:
        resp.holding_name = tx.holding.name
        resp.holding_symbol = tx.holding.symbol
    elif tx.type in ("DEPOSIT", "WITHDRAW"):
        resp.holding_name = "现金"
        resp.holding_symbol = tx.currency or ""
    return resp


@router.delete("/{tx_id}")
def delete_transaction(tx_id: int, account_id: int = Query(default=1), db: Session = Depends(get_db)):
    ok = transaction_service.delete_transaction(db, tx_id, account_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"ok": True}


@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(data: TransactionCreate, account_id: int = Query(default=1), db: Session = Depends(get_db)):
    tx = transaction_service.create_transaction(db, data, account_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Holding not found")
    resp = TransactionResponse.model_validate(tx)
    if tx.holding:
        resp.holding_name = tx.holding.name
        resp.holding_symbol = tx.holding.symbol
    return resp
