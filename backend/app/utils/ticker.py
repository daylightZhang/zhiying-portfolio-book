import enum
from datetime import datetime, timezone, timedelta
from typing import Annotated

from pydantic import PlainSerializer

BEIJING_TZ = timezone(timedelta(hours=8))


def now_beijing() -> datetime:
    """Return current time in Beijing timezone (UTC+8), without tzinfo for SQLite compatibility."""
    return datetime.now(BEIJING_TZ).replace(tzinfo=None)


def _serialize_with_beijing_offset(dt: datetime) -> str:
    """Tag naive datetimes (assumed Beijing) with +08:00 so clients can convert to local time.
    Tz-aware datetimes are emitted with their original offset."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=BEIJING_TZ)
    return dt.isoformat()


def to_beijing_naive(dt: datetime | None) -> datetime | None:
    """Convert any incoming datetime (tz-aware or naive) into a naive Beijing datetime suitable for DB storage.
    Naive datetimes are assumed to already be Beijing-local."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(BEIJING_TZ).replace(tzinfo=None)


# Use this in response schemas instead of bare `datetime`.
# Stored values are naive Beijing time; on JSON output they get tagged with +08:00,
# so the frontend's `new Date(...)` parses them as a real instant and renders in the user's local timezone.
BeijingDateTime = Annotated[
    datetime,
    PlainSerializer(_serialize_with_beijing_offset, return_type=str, when_used="json"),
]


class Market(str, enum.Enum):
    A_SHARE = "A_SHARE"
    HK = "HK"
    US = "US"
    FR = "FR"
    DE = "DE"
    SE = "SE"
    CN_FUTURES = "CN_FUTURES"


class Currency(str, enum.Enum):
    CNY = "CNY"
    HKD = "HKD"
    USD = "USD"
    EUR = "EUR"
    SEK = "SEK"


MARKET_CURRENCY_MAP: dict[Market, Currency] = {
    Market.A_SHARE: Currency.CNY,
    Market.HK: Currency.HKD,
    Market.US: Currency.USD,
    Market.FR: Currency.EUR,
    Market.DE: Currency.EUR,
    Market.SE: Currency.SEK,
    Market.CN_FUTURES: Currency.CNY,
}

MARKET_LABELS: dict[str, str] = {
    "A_SHARE": "A股",
    "A_SHARE_SH": "A股",
    "A_SHARE_SZ": "A股",
    "HK": "港股",
    "US": "美股",
    "FR": "法股",
    "DE": "德股",
    "SE": "瑞典股",
    "CN_FUTURES": "中国期货",
    "FUTURES": "中国期货",
}

MARKET_TICKER_HINTS: dict[Market, str] = {
    Market.A_SHARE: "如 600519, 000858, 300750",
    Market.HK: "如 0700.HK",
    Market.US: "如 AAPL",
    Market.FR: "如 MC.PA",
    Market.DE: "如 SAP.DE",
    Market.SE: "如 VOLV-B.ST",
    Market.CN_FUTURES: "如 IF0(主力), IF2406(合约)",
}

# AKShare 使用的市场标识
AKSHARE_MARKETS = {Market.A_SHARE, Market.CN_FUTURES}
YFINANCE_MARKETS = {Market.HK, Market.US, Market.FR, Market.DE, Market.SE}
