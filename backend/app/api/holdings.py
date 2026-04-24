from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.holding import HoldingCreate, HoldingUpdate, HoldingResponse
from app.services import holding_service

router = APIRouter(prefix="/holdings", tags=["holdings"])


@router.get("", response_model=list[HoldingResponse])
def list_holdings(market: str | None = None, db: Session = Depends(get_db)):
    return holding_service.get_all_holdings(db, market)


@router.get("/{holding_id}", response_model=HoldingResponse)
def get_holding(holding_id: int, db: Session = Depends(get_db)):
    holding = holding_service.get_holding(db, holding_id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    return holding


@router.post("", response_model=HoldingResponse, status_code=201)
def create_holding(data: HoldingCreate, db: Session = Depends(get_db)):
    return holding_service.create_holding(db, data)


@router.put("/{holding_id}", response_model=HoldingResponse)
def update_holding(holding_id: int, data: HoldingUpdate, db: Session = Depends(get_db)):
    holding = holding_service.update_holding(db, holding_id, data)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    return holding


@router.delete("/{holding_id}")
def delete_holding(holding_id: int, db: Session = Depends(get_db)):
    if not holding_service.delete_holding(db, holding_id):
        raise HTTPException(status_code=404, detail="Holding not found")
    return {"ok": True}
