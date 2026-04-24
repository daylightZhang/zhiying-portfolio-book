from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import market_data_service

router = APIRouter(prefix="/market-data", tags=["market-data"])


@router.post("/refresh")
def refresh_all(db: Session = Depends(get_db)):
    return market_data_service.refresh_all_prices(db)


@router.post("/refresh/{symbol}")
def refresh_single(symbol: str, db: Session = Depends(get_db)):
    return market_data_service.refresh_single_price(db, symbol)


@router.get("/quote/{symbol}")
def get_quote(symbol: str):
    return market_data_service.get_quote(symbol)


@router.get("/indices")
def get_indices():
    return market_data_service.get_market_indices()
