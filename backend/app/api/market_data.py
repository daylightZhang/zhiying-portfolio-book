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
    """Get candlestick chart data. A-share uses Yahoo format (.SS/.SZ) via finance-query."""
    import httpx

    def _a_share_to_yahoo(sym: str) -> str:
        """Convert A-share code to Yahoo format: 600xxx->.SS, others->.SZ"""
        if sym.startswith(("6", "5")):
            return f"{sym}.SS"
        return f"{sym}.SZ"

    def _is_a_share(sym: str) -> bool:
        """Check if symbol looks like A-share (pure 6-digit number)."""
        return sym.isdigit() and len(sym) == 6

    query_symbol = _a_share_to_yahoo(symbol) if _is_a_share(symbol) else symbol

    try:
        resp = httpx.get(
            f"https://finance-query.com/v2/chart/{query_symbol}",
            params={"range": range, "interval": interval},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            data["symbol"] = symbol  # return original symbol
            return data
    except Exception:
        pass
    return {"candles": [], "symbol": symbol, "range": range, "interval": interval}
