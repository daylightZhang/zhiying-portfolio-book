from datetime import datetime, timedelta
from app.utils.ticker import now_beijing
from sqlalchemy.orm import Session
from sqlalchemy import select
import yfinance as yf

from app.models.exchange_rate import ExchangeRate
from app.utils.ticker import Currency

FOREX_TICKERS = {
    Currency.CNY: "CNY=X",
    Currency.HKD: "HKD=X",
    Currency.EUR: "EUR=X",
    Currency.SEK: "SEK=X",
}

_rate_cache: dict[str, tuple[float, datetime]] = {}
_CACHE_TTL = timedelta(minutes=30)


def _cache_key(from_c: str, to_c: str) -> str:
    return f"{from_c}_{to_c}"


def get_rate(db: Session, from_currency: str, to_currency: str) -> float:
    if from_currency == to_currency:
        return 1.0

    key = _cache_key(from_currency, to_currency)
    now = now_beijing()

    if key in _rate_cache:
        rate, cached_at = _rate_cache[key]
        if now - cached_at < _CACHE_TTL:
            return rate

    row = db.scalar(
        select(ExchangeRate).where(
            ExchangeRate.from_currency == from_currency,
            ExchangeRate.to_currency == to_currency,
        )
    )
    if row:
        _rate_cache[key] = (row.rate, now)
        return row.rate

    if from_currency == "USD":
        usd_to_target = _fetch_usd_rate(to_currency)
        if usd_to_target:
            _store_rate(db, "USD", to_currency, usd_to_target)
            return usd_to_target
    elif to_currency == "USD":
        usd_to_source = _fetch_usd_rate(from_currency)
        if usd_to_source:
            rate = 1.0 / usd_to_source
            _store_rate(db, from_currency, "USD", rate)
            return rate
    else:
        usd_to_from = _fetch_usd_rate(from_currency)
        usd_to_to = _fetch_usd_rate(to_currency)
        if usd_to_from and usd_to_to:
            rate = usd_to_to / usd_to_from
            _store_rate(db, from_currency, to_currency, rate)
            return rate

    return 1.0


def _fetch_usd_rate(currency: str) -> float | None:
    ticker_symbol = f"{currency}=X"
    try:
        ticker = yf.Ticker(ticker_symbol)
        price = ticker.fast_info.get("lastPrice") or ticker.fast_info.get("previousClose")
        return float(price) if price else None
    except Exception:
        return None


def _store_rate(db: Session, from_c: str, to_c: str, rate: float):
    now = now_beijing()
    existing = db.scalar(
        select(ExchangeRate).where(
            ExchangeRate.from_currency == from_c,
            ExchangeRate.to_currency == to_c,
        )
    )
    if existing:
        existing.rate = rate
        existing.updated_at = now
    else:
        db.add(ExchangeRate(from_currency=from_c, to_currency=to_c, rate=rate, updated_at=now))
    db.commit()
    _rate_cache[_cache_key(from_c, to_c)] = (rate, now)


def refresh_all_rates(db: Session) -> list[dict]:
    results = []
    for currency, ticker_symbol in FOREX_TICKERS.items():
        try:
            ticker = yf.Ticker(ticker_symbol)
            price = ticker.fast_info.get("lastPrice") or ticker.fast_info.get("previousClose")
            if price:
                rate = float(price)
                _store_rate(db, "USD", currency.value, rate)
                results.append({"pair": f"USD/{currency.value}", "rate": rate, "status": "ok"})
            else:
                results.append({"pair": f"USD/{currency.value}", "status": "failed"})
        except Exception as e:
            results.append({"pair": f"USD/{currency.value}", "status": "failed", "error": str(e)})
    return results


def get_all_rates(db: Session) -> list[ExchangeRate]:
    return list(db.scalars(select(ExchangeRate)).all())
