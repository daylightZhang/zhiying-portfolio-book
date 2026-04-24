from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.portfolio import PortfolioSummary, HoldingSummary, MarketBreakdown, ExchangeRateResponse
from app.services import holding_service, currency_service, cash_service
from app.utils.ticker import MARKET_LABELS

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/summary", response_model=PortfolioSummary)
def get_summary(
    base_currency: str = Query(default="CNY"),
    db: Session = Depends(get_db),
):
    holdings = holding_service.get_all_holdings(db)

    holding_summaries = []
    total_market_value = 0.0
    total_cost = 0.0
    by_market: dict[str, float] = {}
    by_currency: dict[str, float] = {}
    rate_map: dict[str, float] = {}
    last_refreshed = None

    for h in holdings:
        price = h.current_price or 0.0
        ratio = getattr(h, 'holding_ratio', 1.0) or 1.0
        multiplier = getattr(h, 'contract_multiplier', 1.0) or 1.0

        market_value_native = h.quantity * price * multiplier * ratio
        cost_total_native = h.quantity * h.cost_price * multiplier * ratio

        fx_rate = currency_service.get_rate(db, h.currency, base_currency)
        rate_key = f"{h.currency}_{base_currency}"
        if rate_key not in rate_map and h.currency != base_currency:
            rate_map[rate_key] = fx_rate

        market_value_base = market_value_native * fx_rate
        cost_total_base = cost_total_native * fx_rate

        gain_loss = market_value_base - cost_total_base
        gain_loss_pct = (gain_loss / cost_total_base * 100) if cost_total_base else 0.0

        total_market_value += market_value_base
        total_cost += cost_total_base

        market_label = MARKET_LABELS.get(h.market, h.market)
        by_market[market_label] = by_market.get(market_label, 0) + market_value_base
        by_currency[h.currency] = by_currency.get(h.currency, 0) + market_value_base

        if h.price_updated_at:
            if last_refreshed is None or h.price_updated_at > last_refreshed:
                last_refreshed = h.price_updated_at

        holding_summaries.append(HoldingSummary(
            id=h.id,
            symbol=h.symbol,
            name=h.name,
            market=h.market,
            quantity=h.quantity,
            cost_price=h.cost_price,
            holding_ratio=ratio,
            contract_multiplier=multiplier,
            current_price=h.current_price,
            currency=h.currency,
            market_value=market_value_native,
            market_value_base=market_value_base,
            cost_total=cost_total_base,
            gain_loss=gain_loss,
            gain_loss_pct=gain_loss_pct,
            weight_pct=0,
            price_updated_at=h.price_updated_at,
        ))

    # Cash balances
    cash_rows = cash_service.get_all_balances(db)
    cash_balances_map: dict[str, float] = {}
    total_cash = 0.0
    for cb in cash_rows:
        cash_balances_map[cb.currency] = cb.balance
        fx = currency_service.get_rate(db, cb.currency, base_currency)
        total_cash += cb.balance * fx

    # Total assets = holdings + cash
    total_assets = total_market_value + total_cash

    for s in holding_summaries:
        s.weight_pct = (s.market_value_base / total_assets * 100) if total_assets else 0

    total_gain_loss = total_market_value - total_cost
    total_gain_loss_pct = (total_gain_loss / total_cost * 100) if total_cost else 0

    market_breakdown = {
        k: MarketBreakdown(value=v, weight_pct=(v / total_assets * 100) if total_assets else 0)
        for k, v in by_market.items()
    }
    currency_breakdown = {
        k: MarketBreakdown(value=v, weight_pct=(v / total_assets * 100) if total_assets else 0)
        for k, v in by_currency.items()
    }

    return PortfolioSummary(
        base_currency=base_currency,
        total_market_value=total_market_value,
        total_cost=total_cost,
        total_gain_loss=total_gain_loss,
        total_gain_loss_pct=total_gain_loss_pct,
        total_cash=total_cash,
        cash_balances=cash_balances_map,
        holdings=holding_summaries,
        by_market=market_breakdown,
        by_currency=currency_breakdown,
        exchange_rates=rate_map,
        last_refreshed=last_refreshed,
    )


@router.post("/exchange-rates/refresh")
def refresh_rates(db: Session = Depends(get_db)):
    return currency_service.refresh_all_rates(db)


@router.get("/exchange-rates", response_model=list[ExchangeRateResponse])
def get_rates(db: Session = Depends(get_db)):
    return currency_service.get_all_rates(db)
