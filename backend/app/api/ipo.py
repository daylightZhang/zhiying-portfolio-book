import re
import json
import time
import logging
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.ipo_reminder import IPOReminder

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ipo", tags=["ipo"])

# --- Module-level cache ---
_ipo_cache: dict | None = None
_ipo_cache_time: float = 0
_IPO_CACHE_TTL = 3600  # 1 hour


def _fetch_ipo_data_playwright() -> tuple[list[dict], list[dict]]:
    """Use Playwright to fetch both listed and upcoming IPO data from moomoo."""
    from playwright.sync_api import sync_playwright

    finished_raw: list[dict] = []
    applying_raw: list[dict] = []
    ssr_html_captured: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        def handle_response(response):
            url = response.url
            # Capture the initial HTML to extract __INITIAL_STATE__
            if "moomoo.com/hans/quote/us/ipo" in url and "text/html" in (response.headers.get("content-type", "")):
                try:
                    ssr_html_captured.append(response.text())
                except Exception:
                    pass
            # Capture XHR responses for IPO list
            if "get-ipo-list" in url:
                try:
                    body = response.json()
                    if body.get("code") == 0:
                        items = body.get("data", {}).get("list", [])
                        if "ipoType=2" in url:
                            applying_raw.extend(items)
                        else:
                            finished_raw.extend(items)
                except Exception:
                    pass

        page.on("response", handle_response)

        # Load page
        page.goto(
            "https://www.moomoo.com/hans/quote/us/ipo",
            wait_until="domcontentloaded",
            timeout=30000,
        )
        page.wait_for_timeout(3000)

        # Extract finished list from SSR HTML
        if not finished_raw and ssr_html_captured:
            for html in ssr_html_captured:
                match = re.search(
                    r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});\s*</script>',
                    html,
                    re.DOTALL,
                )
                if match:
                    data_str = match.group(1)
                    for end in range(len(data_str), max(0, len(data_str) - 2000), -1):
                        try:
                            state = json.loads(data_str[:end])
                            ssr_finished = state.get("ipo_finished_list", {}).get("list", [])
                            if ssr_finished:
                                finished_raw.extend(ssr_finished)
                            break
                        except json.JSONDecodeError:
                            continue
                    break

        # Click "待上市" tab to trigger the XHR for applying list
        try:
            tab = page.locator("span:has-text('待上市')").first
            if tab.is_visible(timeout=3000):
                tab.click()
                page.wait_for_timeout(4000)
        except Exception as e:
            logger.warning(f"Could not click 待上市 tab: {e}")

        browser.close()

    return finished_raw, applying_raw


def _fetch_ipo_data_simple() -> tuple[list[dict], list[dict]]:
    """Fallback: fetch only listed IPOs from SSR (no Playwright needed)."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }
    resp = httpx.get(
        "https://www.moomoo.com/hans/quote/us/ipo",
        headers=headers,
        timeout=20,
        follow_redirects=True,
    )
    resp.raise_for_status()

    match = re.search(
        r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});\s*</script>',
        resp.text,
        re.DOTALL,
    )
    if not match:
        raise ValueError("Could not find __INITIAL_STATE__ in page")

    data_str = match.group(1)
    data = None
    for end in range(len(data_str), max(0, len(data_str) - 2000), -1):
        try:
            data = json.loads(data_str[:end])
            break
        except json.JSONDecodeError:
            continue
    if data is None:
        raise ValueError("Failed to parse __INITIAL_STATE__ JSON")

    finished_raw = data.get("ipo_finished_list", {}).get("list", [])
    applying_raw = data.get("ipo_applying_list", {}).get("list", [])
    return finished_raw, applying_raw


def _format_finished_item(raw: dict) -> dict:
    """Format a listed (finished) IPO item."""
    listing_ts = raw.get("listingDate", 0)
    listing_date = ""
    if listing_ts:
        listing_date = datetime.fromtimestamp(listing_ts).strftime("%Y-%m-%d")

    return {
        "symbol": raw.get("stockCode", ""),
        "name": raw.get("name", ""),
        "listing_date": listing_date,
        "price": raw.get("price", "--"),
        "ipo_price": raw.get("ipoPrice", "--"),
        "first_day_change": raw.get("firstDayPcr", "--"),
        "cumulative_change": raw.get("ipoPriceChangeRatio", "--"),
        "market_cap": raw.get("marketVal", "--"),
        "industry": raw.get("industry", "--"),
        "status": "listed",
    }


def _format_upcoming_item(raw: dict) -> dict:
    """Format an upcoming (applying) IPO item."""
    listing_ts = raw.get("listingDate", 0)
    listing_date = ""
    if listing_ts and listing_ts > 0:
        listing_date = datetime.fromtimestamp(listing_ts).strftime("%Y-%m-%d")

    # Upcoming items may use 'ipoDate' field as string (format: 2026/05/06)
    if not listing_date and raw.get("ipoDate"):
        listing_date = raw.get("ipoDate", "").replace("/", "-")

    return {
        "symbol": raw.get("stockCode", ""),
        "name": raw.get("name", ""),
        "listing_date": listing_date,
        "price": "--",
        "ipo_price": raw.get("ipoPrice", "--"),
        "first_day_change": "--",
        "cumulative_change": "--",
        "market_cap": "--",
        "industry": raw.get("industry", "--"),
        "status": "upcoming",
    }


def _get_ipo_list() -> dict:
    """Return cached or freshly fetched IPO data."""
    global _ipo_cache, _ipo_cache_time

    now = time.time()
    if _ipo_cache and (now - _ipo_cache_time) < _IPO_CACHE_TTL:
        return _ipo_cache

    try:
        # Try Playwright first for full data (listed + upcoming)
        finished_raw, applying_raw = _fetch_ipo_data_playwright()
    except Exception as e:
        logger.warning(f"Playwright fetch failed: {e}, falling back to simple fetch")
        try:
            finished_raw, applying_raw = _fetch_ipo_data_simple()
        except Exception as e2:
            logger.warning(f"Simple fetch also failed: {e2}")
            if _ipo_cache:
                return _ipo_cache
            return {"listed": [], "upcoming": [], "updated_at": None}

    listed = [_format_finished_item(item) for item in finished_raw]
    upcoming = [_format_upcoming_item(item) for item in applying_raw]

    result = {
        "listed": listed,
        "upcoming": upcoming,
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    _ipo_cache = result
    _ipo_cache_time = now
    return result


# --- API Endpoints ---


@router.get("/list")
def get_ipo_list():
    """Return listed + upcoming IPO data."""
    return _get_ipo_list()


# --- Reminder endpoints ---


class ReminderCreate(BaseModel):
    symbol: str
    name: str | None = None
    listing_date: str  # "2026-05-10"


@router.get("/reminders")
def get_reminders(db: Session = Depends(get_db)):
    """Get all configured reminders."""
    rows = list(db.scalars(select(IPOReminder).order_by(IPOReminder.listing_date.desc())).all())
    return [
        {"symbol": r.symbol, "name": r.name, "listing_date": r.listing_date}
        for r in rows
    ]


@router.post("/reminders", status_code=201)
def add_reminder(data: ReminderCreate, db: Session = Depends(get_db)):
    """Add a reminder for an IPO symbol."""
    existing = db.scalars(
        select(IPOReminder).where(IPOReminder.symbol == data.symbol)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Reminder already exists")
    reminder = IPOReminder(
        symbol=data.symbol,
        name=data.name,
        listing_date=data.listing_date,
    )
    db.add(reminder)
    db.commit()
    return {"ok": True}


@router.delete("/reminders/{symbol}")
def remove_reminder(symbol: str, db: Session = Depends(get_db)):
    """Remove a reminder by symbol."""
    reminder = db.scalars(
        select(IPOReminder).where(IPOReminder.symbol == symbol)
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
    return {"ok": True}


@router.get("/reminders/active")
def get_active_reminders(db: Session = Depends(get_db)):
    """Get reminders that should trigger alerts (listing date within 7 days from now)."""
    today = datetime.now().date()
    rows = list(db.scalars(select(IPOReminder)).all())
    active = []
    for r in rows:
        try:
            ld = datetime.strptime(r.listing_date, "%Y-%m-%d").date()
        except ValueError:
            continue
        days_until = (ld - today).days
        if -1 <= days_until <= 7:  # from 7 days before to 1 day after listing
            active.append({
                "symbol": r.symbol,
                "name": r.name,
                "listing_date": r.listing_date,
                "days_until": days_until,
            })
    return active
