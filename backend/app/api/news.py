import re
import json
from datetime import datetime, timedelta
from fastapi import APIRouter
from app.utils.ticker import now_beijing

router = APIRouter(prefix="/news", tags=["news"])

_flash_cache: list[dict] = []
_flash_cache_time: datetime | None = None
_FLASH_CACHE_TTL = timedelta(seconds=30)


def _fetch_flash() -> list[dict]:
    import httpx
    resp = httpx.get("https://www.jin10.com/flash_newest.js", timeout=10, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://www.jin10.com/",
    })
    if resp.status_code != 200:
        return []
    # Parse "var newest = [...];" format
    match = re.search(r'var\s+newest\s*=\s*(\[.*\])\s*;?', resp.text, re.DOTALL)
    if not match:
        return []
    items = json.loads(match.group(1))
    # Filter out VIP locked content and pure-English items
    result = []
    for item in items:
        data = item.get("data", {})
        if data.get("lock"):
            continue
        channels = item.get("channel", [])
        if channels == [5]:
            continue
        result.append(item)
    return result


@router.get("/flash")
def get_flash_news():
    global _flash_cache, _flash_cache_time
    now = now_beijing()

    if _flash_cache and _flash_cache_time and (now - _flash_cache_time) < _FLASH_CACHE_TTL:
        return _flash_cache

    try:
        items = _fetch_flash()
        if items:
            _flash_cache = items
            _flash_cache_time = now
        return _flash_cache
    except Exception:
        return _flash_cache or []
