from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import market_data_service

router = APIRouter(prefix="/market-data", tags=["market-data"])


@router.post("/refresh")
def refresh_all(account_id: int = Query(default=1), db: Session = Depends(get_db)):
    return market_data_service.refresh_all_prices(db, account_id)


@router.post("/refresh/{symbol}")
def refresh_single(symbol: str, account_id: int = Query(default=1), db: Session = Depends(get_db)):
    return market_data_service.refresh_single_price(db, symbol, account_id)


@router.get("/quote/{symbol}")
def get_quote(symbol: str):
    return market_data_service.get_quote(symbol)


@router.get("/indices")
def get_indices():
    return market_data_service.get_market_indices()


@router.get("/chart/{symbol}")
def get_chart(symbol: str, range: str = "3mo", interval: str = "1d"):
    """Get candlestick chart data from finance-query.com."""
    import httpx
    try:
        resp = httpx.get(
            f"https://finance-query.com/v2/chart/{symbol}",
            params={"range": range, "interval": interval},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {"candles": [], "symbol": symbol, "range": range, "interval": interval}
