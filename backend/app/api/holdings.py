from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.holding import Holding
from app.models.account import Account
from app.models.market_quote import MarketQuote
from app.schemas.holding import HoldingCreate, HoldingUpdate, HoldingResponse
from app.services import holding_service

router = APIRouter(prefix="/holdings", tags=["holdings"])


def _enrich_response(db: Session, holding: Holding) -> HoldingResponse:
    """Build HoldingResponse with broker info and market quote price."""
    resp = HoldingResponse.model_validate(holding)
    # Fill price from market_quotes
    quote = db.get(MarketQuote, holding.symbol)
    if quote:
        resp.current_price = quote.price
        resp.price_updated_at = quote.updated_at
    if holding.linked_broker_holding_id:
        broker_h = db.get(Holding, holding.linked_broker_holding_id)
        if broker_h:
            resp.broker_holding_symbol = broker_h.symbol
            broker_acct = db.get(Account, broker_h.account_id)
            resp.broker_account_name = broker_acct.name if broker_acct else None
    return resp


@router.get("/broker-positions")
def list_broker_positions(db: Session = Depends(get_db)):
    """Get all broker account holdings for linking dropdown."""
    broker_accounts = list(db.scalars(
        select(Account).where(Account.type == "broker")
    ).all())
    result = []
    for acct in broker_accounts:
        holdings = list(db.scalars(
            select(Holding)
            .where(Holding.account_id == acct.id, Holding.quantity > 0)
            .order_by(Holding.symbol)
        ).all())
        for h in holdings:
            result.append({
                "id": h.id,
                "symbol": h.symbol,
                "name": h.name,
                "market": h.market,
                "quantity": h.quantity,
                "cost_price": h.cost_price,
                "currency": h.currency,
                "account_id": acct.id,
                "account_name": acct.name,
            })
    return result


@router.get("", response_model=list[HoldingResponse])
def list_holdings(market: str | None = None, account_id: int = Query(default=1), db: Session = Depends(get_db)):
    holdings = holding_service.get_all_holdings(db, market, account_id)
    return [_enrich_response(db, h) for h in holdings]


@router.get("/{holding_id}", response_model=HoldingResponse)
def get_holding(holding_id: int, db: Session = Depends(get_db)):
    holding = holding_service.get_holding(db, holding_id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    return _enrich_response(db, holding)


@router.post("", response_model=HoldingResponse, status_code=201)
def create_holding(data: HoldingCreate, account_id: int = Query(default=1), db: Session = Depends(get_db)):
    holding = holding_service.create_holding(db, data, account_id)
    return _enrich_response(db, holding)


@router.put("/{holding_id}", response_model=HoldingResponse)
def update_holding(holding_id: int, data: HoldingUpdate, db: Session = Depends(get_db)):
    holding = holding_service.update_holding(db, holding_id, data)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    return _enrich_response(db, holding)


@router.delete("/{holding_id}")
def delete_holding(holding_id: int, db: Session = Depends(get_db)):
    if not holding_service.delete_holding(db, holding_id):
        raise HTTPException(status_code=404, detail="Holding not found")
    return {"ok": True}
