from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.holding import Holding
from app.models.transaction import Transaction
from app.schemas.portfolio import PortfolioSummary, HoldingSummary, MarketBreakdown, ExchangeRateResponse
from app.services import holding_service, currency_service, cash_service
from app.utils.ticker import MARKET_LABELS

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/summary", response_model=PortfolioSummary)
def get_summary(
    base_currency: str = Query(default="CNY"),
    account_id: int = Query(default=1),
    db: Session = Depends(get_db),
):
    holdings = holding_service.get_all_holdings(db, account_id=account_id)

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

        if h.market == "CN_FUTURES":
            margin_rate = getattr(h, 'margin_rate', 0.0) or 0.0
            margin_occupied = h.quantity * h.cost_price * multiplier * margin_rate * ratio
            unrealized_pnl = (price - h.cost_price) * multiplier * h.quantity * ratio
            market_value_native = margin_occupied + unrealized_pnl
            cost_total_native = margin_occupied
        else:
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
            margin_rate=getattr(h, 'margin_rate', 0.0) or 0.0,
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

    # Realized P&L: replay all transactions to compute accurately
    total_realized_pnl = 0.0
    all_holdings_ids = [h.id for h in holdings]
    # Also include deleted holdings' transactions (holding_id still in DB if cascade didn't clean)
    all_txs = list(db.scalars(
        select(Transaction)
        .where(Transaction.account_id == account_id)
        .where(Transaction.holding_id.isnot(None))
        .order_by(Transaction.transacted_at.asc())
    ).all())

    # Group transactions by holding_id
    txs_by_holding: dict[int, list] = {}
    for tx in all_txs:
        txs_by_holding.setdefault(tx.holding_id, []).append(tx)

    # For each holding (current + any with sell history), replay to get realized P&L
    holding_map = {h.id: h for h in holdings}
    for hid, txs in txs_by_holding.items():
        h = holding_map.get(hid)
        multiplier = (getattr(h, 'contract_multiplier', 1.0) or 1.0) if h else 1.0
        ratio = (getattr(h, 'holding_ratio', 1.0) or 1.0) if h else 1.0
        is_futures = h.market == "CN_FUTURES" if h else False
        currency = h.currency if h else (txs[0].currency or "CNY")

        # Replay: track running avg cost
        running_qty = 0.0
        running_cost = 0.0  # avg cost per unit
        realized_native = 0.0

        for tx in txs:
            if tx.type == "BUY":
                if running_qty + tx.quantity > 0:
                    running_cost = (running_qty * running_cost + tx.quantity * tx.price) / (running_qty + tx.quantity)
                running_qty += tx.quantity
            elif tx.type == "SELL":
                if is_futures:
                    realized_native += (tx.price - running_cost) * tx.quantity * multiplier * ratio
                else:
                    realized_native += (tx.price - running_cost) * tx.quantity * multiplier * ratio
                running_qty = max(0, running_qty - tx.quantity)
            elif tx.type == "ADJUST":
                running_qty = tx.quantity
                running_cost = tx.price

        fx_rate = currency_service.get_rate(db, currency, base_currency)
        total_realized_pnl += realized_native * fx_rate

    # Cash balances
    cash_rows = cash_service.get_all_balances(db, account_id)
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
        total_realized_pnl=total_realized_pnl,
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
