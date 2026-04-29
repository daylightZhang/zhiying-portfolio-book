from datetime import datetime, timezone, timedelta
from app.utils.ticker import now_beijing
from sqlalchemy.orm import Session
from sqlalchemy import select
import yfinance as yf

from app.models.holding import Holding
from app.models.market_quote import MarketQuote
from app.utils.ticker import AKSHARE_MARKETS


def _get_cached_price(db: Session, symbol: str) -> tuple[float | None, datetime | None]:
    """Get cached price from market_quotes table."""
    q = db.get(MarketQuote, symbol)
    if q:
        return q.price, q.updated_at
    return None, None


def _save_quotes(db: Session, updates: dict[str, tuple[float, datetime]]):
    """Batch upsert prices into market_quotes table."""
    for sym, (price, updated_at) in updates.items():
        existing = db.get(MarketQuote, sym)
        if existing:
            existing.price = price
            existing.updated_at = updated_at
        else:
            db.add(MarketQuote(symbol=sym, price=price, updated_at=updated_at))


def refresh_all_prices(db: Session, account_id: int = 1) -> dict:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    holdings = list(db.scalars(select(Holding).where(Holding.account_id == account_id, Holding.quantity > 0)).all())
    if not holdings:
        return {"updated": 0, "failed": 0, "details": []}

    # Deduplicate: only fetch once per symbol
    seen_symbols: set[str] = set()
    unique_holdings: list[Holding] = []
    for h in holdings:
        if h.symbol not in seen_symbols:
            seen_symbols.add(h.symbol)
            unique_holdings.append(h)

    now = now_beijing()
    results = {"updated": 0, "failed": 0, "details": []}

    def _resolve_one(h: Holding) -> dict:
        """Resolve price for one holding through its best fallback chain."""
        symbol = h.symbol

        if h.market == "A_SHARE":
            # AKShare first, then finance-query as fallback
            import akshare as ak
            try:
                return {"symbol": symbol, "price": _akshare_stock_fallback(ak, symbol), "status": "ok", "source": "akshare"}
            except Exception:
                pass
            # Fallback: finance-query with .SS/.SZ suffix
            try:
                yf_symbol = _a_share_to_yahoo(symbol)
                price = _finance_query_price(yf_symbol)
                if price:
                    return {"symbol": symbol, "price": price, "status": "ok", "source": "finance-query"}
            except Exception:
                pass

        elif h.market == "CN_FUTURES":
            import akshare as ak
            try:
                df = ak.futures_zh_spot(symbol=symbol, market="FF", adjust="0")
                if df is not None and not df.empty:
                    return {"symbol": symbol, "price": float(df.iloc[-1]["current_price"]), "status": "ok", "source": "akshare"}
            except Exception:
                pass

        else:
            # DB cache: if updated within 1 minute, skip online fetch
            cached_price, cached_at = _get_cached_price(db, symbol)
            if cached_price is not None and cached_at is not None:
                age = (now - cached_at).total_seconds()
                if age < 60:
                    return {"symbol": symbol, "price": cached_price, "status": "ok", "source": "cache"}

            # International: google-finance (realtime) → yfinance (realtime) → finance-query (delayed) → akshare-us
            try:
                price = _google_finance_price(symbol)
                if price:
                    return {"symbol": symbol, "price": price, "status": "ok", "source": "google-finance", "realtime": True}
            except Exception:
                pass
            try:
                ticker = yf.Ticker(symbol)
                price = ticker.fast_info.get("lastPrice") or ticker.fast_info.get("previousClose")
                if price:
                    return {"symbol": symbol, "price": float(price), "status": "ok", "source": "yfinance", "realtime": True}
            except Exception:
                pass
            try:
                price = _finance_query_price(symbol)
                if price:
                    return {"symbol": symbol, "price": price, "status": "ok", "source": "finance-query"}
            except Exception:
                pass
            if h.market == "US":
                try:
                    price = _akshare_us_stock_price(symbol)
                    if price:
                        return {"symbol": symbol, "price": price, "status": "ok", "source": "akshare-us"}
                except Exception:
                    pass

        # All online sources failed — use cached price from market_quotes
        cached_price, _ = _get_cached_price(db, symbol)
        if cached_price is not None:
            return {"symbol": symbol, "price": cached_price, "status": "ok", "source": "cache"}
        return {"symbol": symbol, "status": "failed", "error": "all sources failed"}

    # Fetch prices in parallel, one thread per unique symbol
    price_updates: dict[str, tuple[float, datetime]] = {}

    with ThreadPoolExecutor(max_workers=max(1, len(unique_holdings))) as executor:
        future_map = {executor.submit(_resolve_one, h): h for h in unique_holdings}
        for fut in as_completed(future_map):
            h = future_map[fut]
            try:
                res = fut.result(timeout=10)
                if res["status"] == "ok":
                    # Update DB for any non-cache source
                    if res.get("source") != "cache":
                        price_updates[h.symbol] = (res["price"], now)
                    results["updated"] += 1
                else:
                    results["failed"] += 1
                results["details"].append(res)
            except Exception as e:
                results["failed"] += 1
                results["details"].append({"symbol": h.symbol, "status": "failed", "error": str(e)})

    # Write price updates to market_quotes table
    if price_updates:
        _save_quotes(db, price_updates)

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


def _a_share_to_yahoo(symbol: str) -> str:
    """Convert A-share code to Yahoo Finance format: SH→.SS, SZ→.SZ."""
    # Shanghai: 6xxxxx, 5xxxxx (ETF), 688xxx (科创板)
    # Shenzhen: 0xxxxx, 3xxxxx, 159xxx (ETF), 12xxxx
    if symbol.startswith(("6", "5", "688")):
        return f"{symbol}.SS"
    return f"{symbol}.SZ"


def _is_etf_symbol(symbol: str) -> bool:
    """Detect A-share ETF codes: SH 51xxxx/56xxxx/58xxxx/50xxxx, SZ 159xxx."""
    return symbol.startswith(("51", "56", "58", "50", "159"))


def _akshare_stock_fallback(ak, symbol: str) -> float:
    """Fallback chain for A-share stocks/ETFs."""
    # ETFs use dedicated fund_etf_hist_em
    if _is_etf_symbol(symbol):
        return _akshare_etf_price(ak, symbol)

    # Stocks: bid_ask_em → stock_zh_a_hist
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


def _akshare_etf_price(ak, symbol: str) -> float:
    """Get A-share ETF price via fund_etf_hist_em."""
    from datetime import date, timedelta
    end = date.today().strftime("%Y%m%d")
    start = (date.today() - timedelta(days=7)).strftime("%Y%m%d")
    df = ak.fund_etf_hist_em(symbol=symbol, period="daily", start_date=start, end_date=end, adjust="")
    if not df.empty:
        return float(df.iloc[-1]["收盘"])
    raise ValueError(f"no ETF price data for {symbol}")


def _akshare_us_stock_price(symbol: str) -> float | None:
    """Get US stock price via akshare (东方财富源, works well in mainland China)."""
    import akshare as ak
    # Try batch spot data first
    try:
        df = ak.stock_us_spot_em()
        # The code column may have prefix like "105.AAPL", try matching the suffix
        row = df[df["代码"].str.upper().str.endswith(f".{symbol.upper()}")]
        if not row.empty:
            return float(row.iloc[0]["最新价"])
    except Exception:
        pass
    # Try individual history as fallback
    try:
        from datetime import date
        end = date.today().strftime("%Y%m%d")
        start = (date.today() - timedelta(days=7)).strftime("%Y%m%d")
        # akshare US symbol format: "105.AAPL" for NASDAQ, "106.BABA" for NYSE
        for prefix in ["105", "106", "107"]:
            try:
                df = ak.stock_us_hist(symbol=f"{prefix}.{symbol.upper()}", period="daily",
                                      start_date=start, end_date=end, adjust="")
                if not df.empty:
                    return float(df.iloc[-1]["收盘"])
            except Exception:
                continue
    except Exception:
        pass
    return None


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

    # Fallback 2: finance-query.com
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

    # Fallback 3: akshare US stocks (works well in mainland China)
    market = symbol_to_holdings.get(symbol, [None])[0]
    if market and getattr(market, 'market', '') == 'US':
        try:
            price = _akshare_us_stock_price(symbol)
            if price:
                for h in symbol_to_holdings.get(symbol, []):
                    h.current_price = price
                    h.price_updated_at = now
                results["updated"] += len(symbol_to_holdings.get(symbol, []))
                results["details"].append({"symbol": symbol, "price": price, "status": "ok", "source": "akshare-us"})
                return
        except Exception:
            pass

    results["failed"] += 1
    results["details"].append({"symbol": symbol, "status": "failed", "error": "all sources failed"})


def refresh_single_price(db: Session, symbol: str, account_id: int = 1) -> dict:
    # Find one holding with this symbol to determine market
    h = db.scalars(select(Holding).where(Holding.symbol == symbol, Holding.quantity > 0)).first()
    if not h:
        return {"status": "not_found"}

    now = now_beijing()
    price = None
    source = None

    if h.market == "A_SHARE":
        import akshare as ak
        try:
            price = _akshare_stock_fallback(ak, symbol)
            source = "akshare"
        except Exception:
            pass
        if price is None:
            try:
                price = _finance_query_price(_a_share_to_yahoo(symbol))
                source = "finance-query"
            except Exception:
                pass

    elif h.market == "CN_FUTURES":
        import akshare as ak
        try:
            df = ak.futures_zh_spot(symbol=symbol, market="FF", adjust="0")
            if df is not None and not df.empty:
                price = float(df.iloc[-1]["current_price"])
                source = "akshare"
        except Exception:
            pass

    else:
        # International: google → yfinance → finance-query → akshare-us
        try:
            price = _google_finance_price(symbol)
            if price:
                source = "google-finance"
        except Exception:
            pass
        if price is None:
            try:
                ticker = yf.Ticker(symbol)
                p = ticker.fast_info.get("lastPrice") or ticker.fast_info.get("previousClose")
                if p:
                    price = float(p)
                    source = "yfinance"
            except Exception:
                pass
        if price is None:
            try:
                price = _finance_query_price(symbol)
                if price:
                    source = "finance-query"
            except Exception:
                pass
        if price is None and h.market == "US":
            try:
                price = _akshare_us_stock_price(symbol)
                if price:
                    source = "akshare-us"
            except Exception:
                pass

    if price is not None:
        _save_quotes(db, {symbol: (price, now)})
        db.commit()
        return {"symbol": symbol, "price": price, "status": "ok", "source": source}

    # All failed — use cached price
    cached_price, _ = _get_cached_price(db, symbol)
    if cached_price is not None:
        return {"symbol": symbol, "price": cached_price, "status": "ok", "source": "cache"}
    return {"symbol": symbol, "status": "failed", "error": "all sources failed"}


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
    now = now_beijing()

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


def _google_finance_price(symbol: str) -> float | None:
    """Get price from Google Finance by scraping data-last-price attribute."""
    import httpx, re
    EXCHANGE_MAP = {
        ".ST": ":STO", ".PA": ":EPA", ".DE": ":ETR", ".HK": ":HKG",
    }
    gf_symbol = None
    for suffix, exchange in EXCHANGE_MAP.items():
        if symbol.endswith(suffix):
            gf_symbol = symbol.replace(suffix, exchange)
            break
    if not gf_symbol:
        # US stocks: try NASDAQ then NYSE
        for exchange in ["NASDAQ", "NYSE", "NYSEARCA"]:
            try:
                resp = httpx.get(
                    f"https://www.google.com/finance/quote/{symbol}:{exchange}?hl=zh",
                    timeout=8,
                    headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"},
                )
                if resp.status_code == 200:
                    m = re.search(r'data-last-price="([0-9.]+)"', resp.text)
                    if m:
                        return float(m.group(1))
            except Exception:
                continue
        return None
    resp = httpx.get(
        f"https://www.google.com/finance/quote/{gf_symbol}?hl=zh",
        timeout=8,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"},
    )
    if resp.status_code == 200:
        m = re.search(r'data-last-price="([0-9.]+)"', resp.text)
        if m:
            return float(m.group(1))
    return None


def _finance_query_price(symbol: str) -> float | None:
    """Get a single stock/index price from finance-query.com."""
    import httpx
    resp = httpx.get(f"https://finance-query.com/v2/quote/{symbol}", timeout=5)
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
            resp = httpx.get(f"https://finance-query.com/v2/quote/{idx['symbol']}", timeout=5)
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
