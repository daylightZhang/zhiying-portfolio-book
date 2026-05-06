import re
import json
import time
import threading
import logging
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database import get_db, SessionLocal
from app.models.ipo_reminder import IPOReminder, IPOStock

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ipo", tags=["ipo"])

_UPDATE_INTERVAL = 3600  # 1 hour


# ============================================================
# Scraping logic (runs in background thread)
# ============================================================


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
            if "moomoo.com/hans/quote/us/ipo" in url and "text/html" in (response.headers.get("content-type", "")):
                try:
                    ssr_html_captured.append(response.text())
                except Exception:
                    pass
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

        # Remove popups/overlays
        page.evaluate("""() => {
            document.querySelectorAll('[class*="gold-flow"], [class*="popup"]').forEach(el => el.remove());
        }""")

        # Click "待上市" tab
        try:
            tab = page.locator("span:has-text('待上市')").first
            if tab.is_visible(timeout=3000):
                tab.click(force=True)
                page.wait_for_timeout(4000)

                # Click through remaining pages
                for page_num in range(2, 20):
                    btn = page.locator(f".base-pagination span.item:has-text('{page_num}')").first
                    try:
                        if btn.is_visible(timeout=1500):
                            btn.click(force=True)
                            page.wait_for_timeout(3000)
                        else:
                            break
                    except Exception:
                        break
        except Exception as e:
            logger.warning(f"Could not fetch 待上市 data: {e}")

        browser.close()

    return finished_raw, applying_raw


def _fetch_ipo_data_simple() -> tuple[list[dict], list[dict]]:
    """Fallback: fetch only listed IPOs from SSR."""
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
    listing_ts = raw.get("listingDate", 0)
    listing_date = ""
    if listing_ts and listing_ts > 0:
        listing_date = datetime.fromtimestamp(listing_ts).strftime("%Y-%m-%d")
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


def _update_ipo_db():
    """Fetch IPO data and write to database. Called by background thread."""
    try:
        finished_raw, applying_raw = _fetch_ipo_data_playwright()
    except Exception as e:
        logger.warning(f"Playwright fetch failed: {e}, falling back to simple fetch")
        try:
            finished_raw, applying_raw = _fetch_ipo_data_simple()
        except Exception as e2:
            logger.warning(f"Simple fetch also failed: {e2}")
            return

    now = datetime.now()
    items: list[dict] = []
    items.extend(_format_finished_item(r) for r in finished_raw)
    items.extend(_format_upcoming_item(r) for r in applying_raw)

    if not items:
        return

    db = SessionLocal()
    try:
        # Clear old data and insert fresh
        db.execute(delete(IPOStock))
        for item in items:
            db.add(IPOStock(
                symbol=item["symbol"],
                name=item["name"],
                listing_date=item["listing_date"],
                price=item["price"],
                ipo_price=item["ipo_price"],
                first_day_change=item["first_day_change"],
                cumulative_change=item["cumulative_change"],
                market_cap=item["market_cap"],
                industry=item["industry"],
                status=item["status"],
                updated_at=now,
            ))
        db.commit()
        logger.info(f"IPO DB updated: {len(items)} items at {now}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update IPO DB: {e}")
    finally:
        db.close()


# ============================================================
# Background scheduler
# ============================================================

_scheduler_started = False


def _scheduler_loop():
    """Background loop: update IPO data every hour."""
    while True:
        try:
            _update_ipo_db()
        except Exception as e:
            logger.error(f"IPO scheduler error: {e}")
        time.sleep(_UPDATE_INTERVAL)


def start_ipo_scheduler():
    """Start the background update thread (called once at app startup)."""
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True
    t = threading.Thread(target=_scheduler_loop, daemon=True, name="ipo-scheduler")
    t.start()
    logger.info("IPO background scheduler started (interval: 1h)")


# ============================================================
# API Endpoints
# ============================================================


@router.get("/list")
def get_ipo_list(db: Session = Depends(get_db)):
    """Read IPO data from database."""
    rows = list(db.scalars(select(IPOStock).order_by(IPOStock.status, IPOStock.listing_date.desc())).all())

    listed = []
    upcoming = []
    updated_at = None

    for r in rows:
        item = {
            "symbol": r.symbol,
            "name": r.name,
            "listing_date": r.listing_date,
            "price": r.price,
            "ipo_price": r.ipo_price,
            "first_day_change": r.first_day_change,
            "cumulative_change": r.cumulative_change,
            "market_cap": r.market_cap,
            "industry": r.industry,
            "status": r.status,
        }
        if r.status == "listed":
            listed.append(item)
        else:
            upcoming.append(item)
        if updated_at is None or r.updated_at > updated_at:
            updated_at = r.updated_at

    return {
        "listed": listed,
        "upcoming": upcoming,
        "updated_at": updated_at.strftime("%Y-%m-%d %H:%M:%S") if updated_at else None,
    }


# --- Reminder endpoints ---


class ReminderCreate(BaseModel):
    symbol: str
    name: str | None = None
    listing_date: str  # "2026-05-10"


@router.get("/reminders")
def get_reminders(db: Session = Depends(get_db)):
    rows = list(db.scalars(select(IPOReminder).order_by(IPOReminder.listing_date.desc())).all())
    return [
        {"symbol": r.symbol, "name": r.name, "listing_date": r.listing_date}
        for r in rows
    ]


@router.post("/reminders", status_code=201)
def add_reminder(data: ReminderCreate, db: Session = Depends(get_db)):
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
    today = datetime.now().date()
    rows = list(db.scalars(select(IPOReminder)).all())
    active = []
    for r in rows:
        try:
            ld = datetime.strptime(r.listing_date, "%Y-%m-%d").date()
        except ValueError:
            continue
        days_until = (ld - today).days
        if -1 <= days_until <= 7:
            active.append({
                "symbol": r.symbol,
                "name": r.name,
                "listing_date": r.listing_date,
                "days_until": days_until,
            })
    return active
