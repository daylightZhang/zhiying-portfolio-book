from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select
import yfinance as yf

from app.models.holding import Holding
from app.utils.ticker import AKSHARE_MARKETS


def refresh_all_prices(db: Session) -> dict:
    holdings = list(db.scalars(select(Holding)).all())
    if not holdings:
        return {"updated": 0, "failed": 0, "details": []}

    results = {"updated": 0, "failed": 0, "details": []}
    now = datetime.now(timezone.utc)

    # Split by data source
    akshare_holdings = [h for h in holdings if h.market in {m.value for m in AKSHARE_MARKETS}]
    yfinance_holdings = [h for h in holdings if h.market not in {m.value for m in AKSHARE_MARKETS}]

    # AKShare: A-shares + CN Futures
    if akshare_holdings:
        _refresh_akshare(db, akshare_holdings, results, now)

    # yfinance: HK, US, FR, SE
    if yfinance_holdings:
        _refresh_yfinance(db, yfinance_holdings, results, now)

    db.commit()
    return results


def _refresh_akshare(db: Session, holdings: list[Holding], results: dict, now: datetime):
    import akshare as ak

    # A-shares: batch fetch all, then filter
    a_share_holdings = [h for h in holdings if h.market == "A_SHARE"]
    futures_holdings = [h for h in holdings if h.market == "CN_FUTURES"]

    if a_share_holdings:
        # Try batch first, then individual fallbacks
        batch_prices: dict[str, float] = {}
        try:
            df = ak.stock_zh_a_spot_em()
            for h in a_share_holdings:
                row = df[df["代码"] == h.symbol]
                if not row.empty:
                    batch_prices[h.symbol] = float(row.iloc[0]["最新价"])
        except Exception:
            pass

        for h in a_share_holdings:
            try:
                if h.symbol in batch_prices:
                    price = batch_prices[h.symbol]
                else:
                    price = _akshare_stock_fallback(ak, h.symbol)

                h.current_price = price
                h.price_updated_at = now
                results["updated"] += 1
                results["details"].append({"symbol": h.symbol, "price": price, "status": "ok", "source": "akshare"})
            except Exception as e:
                results["failed"] += 1
                results["details"].append({"symbol": h.symbol, "status": "failed", "error": str(e)})

    # CN Futures: individual fetch
    for h in futures_holdings:
        try:
            df = ak.futures_zh_spot(symbol=h.symbol, market="FF", adjust="0")
            if df is not None and not df.empty:
                price = float(df.iloc[-1]["current_price"])
                h.current_price = price
                h.price_updated_at = now
                results["updated"] += 1
                results["details"].append({"symbol": h.symbol, "price": price, "status": "ok", "source": "akshare"})
            else:
                results["failed"] += 1
                results["details"].append({"symbol": h.symbol, "status": "failed", "error": "no futures data"})
        except Exception as e:
            results["failed"] += 1
            results["details"].append({"symbol": h.symbol, "status": "failed", "error": str(e)})


def _akshare_stock_fallback(ak, symbol: str) -> float:
    """Fallback chain: bid_ask_em → stock_zh_a_hist for individual A-share price."""
    # Try bid/ask first (real-time during trading hours)
    try:
        bid_df = ak.stock_bid_ask_em(symbol=symbol)
        latest_row = bid_df[bid_df["item"] == "最新"]
        if not latest_row.empty:
            return float(latest_row.iloc[0]["value"])
    except Exception:
        pass

    # Fallback: recent history (always works)
    from datetime import date, timedelta
    end = date.today().strftime("%Y%m%d")
    start = (date.today() - timedelta(days=7)).strftime("%Y%m%d")
    df = ak.stock_zh_a_hist(symbol=symbol, period="daily", adjust="", start_date=start, end_date=end)
    if not df.empty:
        return float(df.iloc[-1]["收盘"])

    raise ValueError(f"no price data for {symbol}")


def _refresh_yfinance(db: Session, holdings: list[Holding], results: dict, now: datetime):
    symbols = list(set(h.symbol for h in holdings))
    symbol_to_holdings: dict[str, list[Holding]] = {}
    for h in holdings:
        symbol_to_holdings.setdefault(h.symbol, []).append(h)

    try:
        data = yf.download(symbols, period="1d", progress=False, threads=True)
        if data.empty:
            raise ValueError("Empty data returned")

        for symbol in symbols:
            try:
                if len(symbols) == 1:
                    close_series = data["Close"]
                else:
                    close_series = data["Close"][symbol]

                price = float(close_series.dropna().iloc[-1])
                for h in symbol_to_holdings.get(symbol, []):
                    h.current_price = price
                    h.price_updated_at = now
                results["updated"] += len(symbol_to_holdings.get(symbol, []))
                results["details"].append({"symbol": symbol, "price": price, "status": "ok", "source": "yfinance"})
            except (KeyError, IndexError):
                _yfinance_fallback(symbol, symbol_to_holdings, results, now)
    except Exception:
        for symbol in symbols:
            _yfinance_fallback(symbol, symbol_to_holdings, results, now)


def _yfinance_fallback(symbol: str, symbol_to_holdings: dict, results: dict, now: datetime):
    # Try yfinance individual ticker first
    try:
        ticker = yf.Ticker(symbol)
        price = ticker.fast_info.get("lastPrice") or ticker.fast_info.get("previousClose")
        if price:
            price = float(price)
            for h in symbol_to_holdings.get(symbol, []):
                h.current_price = price
                h.price_updated_at = now
            results["updated"] += len(symbol_to_holdings.get(symbol, []))
            results["details"].append({"symbol": symbol, "price": price, "status": "ok", "source": "yfinance"})
            return
    except Exception:
        pass

    # Fallback to finance-query.com
    try:
        price = _finance_query_price(symbol)
        if price:
            for h in symbol_to_holdings.get(symbol, []):
                h.current_price = price
                h.price_updated_at = now
            results["updated"] += len(symbol_to_holdings.get(symbol, []))
            results["details"].append({"symbol": symbol, "price": price, "status": "ok", "source": "finance-query"})
            return
    except Exception:
        pass

    results["failed"] += 1
    results["details"].append({"symbol": symbol, "status": "failed", "error": "all sources failed"})


def refresh_single_price(db: Session, symbol: str) -> dict:
    holdings = list(db.scalars(select(Holding).where(Holding.symbol == symbol)).all())
    if not holdings:
        return {"status": "not_found"}

    h = holdings[0]
    now = datetime.now(timezone.utc)

    if h.market in {m.value for m in AKSHARE_MARKETS}:
        return _refresh_single_akshare(db, holdings, now)
    else:
        return _refresh_single_yfinance(db, holdings, symbol, now)


def _refresh_single_akshare(db: Session, holdings: list[Holding], now: datetime) -> dict:
    import akshare as ak
    h = holdings[0]
    try:
        if h.market == "A_SHARE":
            price = _akshare_stock_fallback(ak, h.symbol)
            for hh in holdings:
                hh.current_price = price
                hh.price_updated_at = now
            db.commit()
            return {"symbol": h.symbol, "price": price, "status": "ok"}
        elif h.market == "CN_FUTURES":
            df = ak.futures_zh_spot(symbol=h.symbol, market="FF", adjust="0")
            if df is not None and not df.empty:
                price = float(df.iloc[-1]["current_price"])
                for hh in holdings:
                    hh.current_price = price
                    hh.price_updated_at = now
                db.commit()
                return {"symbol": h.symbol, "price": price, "status": "ok"}
        return {"symbol": h.symbol, "status": "failed", "error": "no data"}
    except Exception as e:
        return {"symbol": h.symbol, "status": "failed", "error": str(e)}


def _refresh_single_yfinance(db: Session, holdings: list[Holding], symbol: str, now: datetime) -> dict:
    try:
        ticker = yf.Ticker(symbol)
        price = ticker.fast_info.get("lastPrice") or ticker.fast_info.get("previousClose")
        if price:
            price = float(price)
            for h in holdings:
                h.current_price = price
                h.price_updated_at = now
            db.commit()
            return {"symbol": symbol, "price": price, "status": "ok"}
        return {"symbol": symbol, "status": "failed", "error": "no price data"}
    except Exception as e:
        return {"symbol": symbol, "status": "failed", "error": str(e)}


MARKET_INDICES = [
    {"symbol": "000001.SS", "name": "上证指数"},
    {"symbol": "^GSPC", "name": "标普500"},
    {"symbol": "^IXIC", "name": "纳斯达克"},
    {"symbol": "^HSI", "name": "恒生指数"},
    {"symbol": "^HSTECH", "name": "恒生科技"},
]

# In-memory cache for indices
_indices_cache: list[dict] = []
_indices_cache_time: datetime | None = None
_INDICES_CACHE_TTL = timedelta(minutes=10)


def get_market_indices() -> list[dict]:
    global _indices_cache, _indices_cache_time
    now = datetime.now(timezone.utc)

    if _indices_cache and _indices_cache_time and (now - _indices_cache_time) < _INDICES_CACHE_TTL:
        return _indices_cache

    # Try sources in order: finance-query (free, no key) → yfinance → akshare
    results = _fetch_indices_finance_query()
    if len(results) < 3:
        yf_results = _fetch_indices_yfinance()
        if len(yf_results) > len(results):
            results = yf_results
    if not results:
        results = _fetch_indices_akshare()

    if results:
        _indices_cache = results
        _indices_cache_time = now
    elif _indices_cache:
        return _indices_cache

    return results


def _finance_query_price(symbol: str) -> float | None:
    """Get a single stock/index price from finance-query.com."""
    import httpx
    resp = httpx.get(f"https://finance-query.com/v2/quote/{symbol}", timeout=8)
    if resp.status_code == 200:
        d = resp.json()
        price = d.get("regularMarketPrice")
        return float(price) if price else None
    return None


def _fetch_indices_finance_query() -> list[dict]:
    """Primary source: finance-query.com (free, no API key)."""
    import httpx
    name_map = {idx["symbol"]: idx["name"] for idx in MARKET_INDICES}
    results = []
    for idx in MARKET_INDICES:
        try:
            resp = httpx.get(f"https://finance-query.com/v2/quote/{idx['symbol']}", timeout=8)
            if resp.status_code == 200:
                d = resp.json()
                price = d.get("regularMarketPrice")
                change = d.get("regularMarketChange")
                prev = d.get("regularMarketPreviousClose")
                if price and prev:
                    pct = (float(change) / float(prev) * 100) if change and prev else 0
                    results.append({
                        "symbol": idx["symbol"],
                        "name": name_map[idx["symbol"]],
                        "price": round(float(price), 2),
                        "change": round(float(change), 2),
                        "change_pct": round(pct, 2),
                    })
        except Exception:
            pass
    return results


def _fetch_indices_yfinance() -> list[dict]:
    symbols = [idx["symbol"] for idx in MARKET_INDICES]
    name_map = {idx["symbol"]: idx["name"] for idx in MARKET_INDICES}
    results = []
    try:
        data = yf.download(symbols, period="2d", progress=False, threads=True)
        if data.empty:
            return []
        for sym in symbols:
            try:
                closes = data["Close"][sym].dropna() if len(symbols) > 1 else data["Close"].dropna()
                if len(closes) >= 2:
                    price, prev = float(closes.iloc[-1]), float(closes.iloc[-2])
                elif len(closes) == 1:
                    price = prev = float(closes.iloc[-1])
                else:
                    continue
                change = price - prev
                change_pct = (change / prev * 100) if prev else 0
                results.append({"symbol": sym, "name": name_map[sym], "price": round(price, 2), "change": round(change, 2), "change_pct": round(change_pct, 2)})
            except (KeyError, IndexError):
                pass
    except Exception:
        pass
    return results


def _fetch_indices_akshare() -> list[dict]:
    """Fallback: use akshare for Chinese indices, skip international ones."""
    import akshare as ak
    results = []
    # 上证指数 via akshare
    try:
        from datetime import date, timedelta as td
        end = date.today().strftime("%Y%m%d")
        start = (date.today() - td(days=5)).strftime("%Y%m%d")
        df = ak.stock_zh_index_daily_em(symbol="sh000001", start_date=start, end_date=end)
        if not df.empty and len(df) >= 2:
            price = float(df.iloc[-1]["close"])
            prev = float(df.iloc[-2]["close"])
            change = price - prev
            results.append({"symbol": "000001.SS", "name": "上证指数", "price": round(price, 2), "change": round(change, 2), "change_pct": round(change / prev * 100, 2)})
        elif not df.empty:
            price = float(df.iloc[-1]["close"])
            results.append({"symbol": "000001.SS", "name": "上证指数", "price": round(price, 2), "change": 0, "change_pct": 0})
    except Exception:
        pass
    return results


def get_quote(symbol: str) -> dict:
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.fast_info
        return {
            "symbol": symbol,
            "price": info.get("lastPrice"),
            "previous_close": info.get("previousClose"),
            "currency": info.get("currency"),
        }
    except Exception as e:
        return {"symbol": symbol, "error": str(e)}
