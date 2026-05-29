import logging
from datetime import datetime
from app.utils.ticker import now_beijing
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from app.models.holding import Holding
from app.models.account import Account
from app.models.market_quote import MarketQuote
from app.models.transaction import Transaction
from app.schemas.holding import HoldingCreate, HoldingUpdate
from app.utils.ticker import MARKET_CURRENCY_MAP, Market, Currency

logger = logging.getLogger(__name__)


def _ensure_quote_for_new_symbol(db: Session, symbol: str, account_id: int) -> None:
    """If there's no MarketQuote yet for this symbol, fetch one synchronously.
    Failures are swallowed — the holding is already created and a periodic refresh will fill it in eventually."""
    existing = db.get(MarketQuote, symbol)
    if existing is not None:
        return
    try:
        from app.services import market_data_service
        market_data_service.refresh_single_price(db, symbol, account_id)
    except Exception as e:
        logger.warning("ensure_quote_for_new_symbol failed for %s: %s", symbol, e)


def get_all_holdings(db: Session, market: str | None = None, account_id: int = 1) -> list[Holding]:
    stmt = select(Holding).where(Holding.account_id == account_id).where(Holding.quantity > 0)
    if market:
        stmt = stmt.where(Holding.market == market)
    stmt = stmt.order_by(Holding.market, Holding.symbol)
    return list(db.scalars(stmt).all())


def get_holding(db: Session, holding_id: int) -> Holding | None:
    return db.get(Holding, holding_id)


def create_holding(db: Session, data: HoldingCreate, account_id: int = 1) -> Holding:
    currency = data.currency or MARKET_CURRENCY_MAP.get(data.market, Currency.USD)
    now = now_beijing()
    transacted_at = data.transacted_at or now

    if data.market in (Market.A_SHARE, Market.CN_FUTURES):
        symbol = data.symbol.strip()
    else:
        symbol = data.symbol.strip().upper()

    # Linked holding: sync fields from broker, skip BUY transaction
    if data.linked_broker_holding_id:
        broker_h = db.get(Holding, data.linked_broker_holding_id)
        if not broker_h:
            raise ValueError("Broker holding not found")
        broker_acct = db.get(Account, broker_h.account_id)
        if not broker_acct or broker_acct.type != "broker":
            raise ValueError("Target holding is not in a broker account")

        holding = Holding(
            account_id=account_id,
            symbol=broker_h.symbol,
            name=data.name.strip() or broker_h.name,
            market=broker_h.market,
            quantity=broker_h.quantity,
            cost_price=broker_h.cost_price,
            holding_ratio=data.holding_ratio,
            contract_multiplier=broker_h.contract_multiplier,
            margin_rate=broker_h.margin_rate,
            currency=broker_h.currency,
            linked_broker_holding_id=broker_h.id,
            notes=data.notes,
        )
        db.add(holding)
        db.commit()
        db.refresh(holding)
        _ensure_quote_for_new_symbol(db, holding.symbol, account_id)
        return holding

    holding = Holding(
        account_id=account_id,
        symbol=symbol,
        name=data.name.strip(),
        market=data.market.value,
        quantity=data.quantity,
        cost_price=data.cost_price,
        holding_ratio=data.holding_ratio,
        contract_multiplier=data.contract_multiplier,
        margin_rate=data.margin_rate,
        currency=currency.value,
        notes=data.notes,
    )
    db.add(holding)
    db.flush()

    multiplier = data.contract_multiplier or 1.0
    if data.market.value == "CN_FUTURES":
        margin_rate = data.margin_rate or 0.12
        ratio = data.holding_ratio or 1.0
        trade_amount = data.quantity * data.cost_price * multiplier * margin_rate * ratio
    else:
        trade_amount = data.quantity * data.cost_price * multiplier

    tx = Transaction(
        account_id=account_id,
        holding_id=holding.id,
        type="BUY",
        quantity=data.quantity,
        price=data.cost_price,
        total_amount=trade_amount,
        currency=currency.value,
        transacted_at=transacted_at,
    )
    db.add(tx)

    # Deduct cash (futures don't deduct cash on buy)
    from app.services import cash_service
    if data.market.value != "CN_FUTURES":
        cash_service.on_buy(db, currency.value, trade_amount, account_id)

    db.commit()
    db.refresh(holding)
    _ensure_quote_for_new_symbol(db, holding.symbol, account_id)
    return holding


def update_holding(db: Session, holding_id: int, data: HoldingUpdate) -> Holding | None:
    holding = db.get(Holding, holding_id)
    if not holding:
        return None

    # Unlink from broker
    if data.unlink and holding.linked_broker_holding_id is not None:
        holding.linked_broker_holding_id = None
        holding.updated_at = now_beijing()
        db.commit()
        db.refresh(holding)
        return holding

    # Establish new link to broker
    if data.linked_broker_holding_id is not None:
        broker_h = db.get(Holding, data.linked_broker_holding_id)
        if broker_h:
            broker_acct = db.get(Account, broker_h.account_id)
            if broker_acct and broker_acct.type == "broker":
                holding.linked_broker_holding_id = broker_h.id
                holding.symbol = broker_h.symbol
                holding.name = data.name.strip() if data.name else broker_h.name
                holding.market = broker_h.market
                holding.currency = broker_h.currency
                holding.quantity = broker_h.quantity
                holding.cost_price = broker_h.cost_price
                holding.contract_multiplier = broker_h.contract_multiplier
                holding.margin_rate = broker_h.margin_rate
                if data.holding_ratio is not None:
                    holding.holding_ratio = data.holding_ratio
                holding.updated_at = now_beijing()
                db.commit()
                db.refresh(holding)
                return holding

    # Linked holdings: only allow changing name, holding_ratio, notes
    if holding.linked_broker_holding_id is not None:
        if data.name is not None:
            holding.name = data.name.strip()
        if data.holding_ratio is not None:
            holding.holding_ratio = data.holding_ratio
        if data.notes is not None:
            holding.notes = data.notes
        holding.updated_at = now_beijing()
        db.commit()
        db.refresh(holding)
        return holding

    # Normal (unlinked) holding update
    if data.symbol is not None:
        holding.symbol = data.symbol.strip()
    if data.name is not None:
        holding.name = data.name.strip()
    if data.notes is not None:
        holding.notes = data.notes
    if data.holding_ratio is not None:
        holding.holding_ratio = data.holding_ratio
    if data.contract_multiplier is not None:
        holding.contract_multiplier = data.contract_multiplier
    if data.margin_rate is not None:
        holding.margin_rate = data.margin_rate

    qty_or_cost_changed = False
    if data.quantity is not None or data.cost_price is not None:
        new_qty = data.quantity if data.quantity is not None else holding.quantity
        new_cost = data.cost_price if data.cost_price is not None else holding.cost_price

        tx = Transaction(
            account_id=holding.account_id,
            holding_id=holding.id,
            type="ADJUST",
            quantity=new_qty,
            price=new_cost,
            total_amount=new_qty * new_cost,
            transacted_at=now_beijing(),
            notes=f"Adjusted from qty={holding.quantity}, cost={holding.cost_price}",
        )
        db.add(tx)

        holding.quantity = new_qty
        holding.cost_price = new_cost
        qty_or_cost_changed = True

    holding.updated_at = now_beijing()

    # If this is a broker holding, sync linked holdings
    if qty_or_cost_changed:
        acct = db.get(Account, holding.account_id)
        if acct and acct.type == "broker":
            sync_linked_holdings(db, holding.id)

    db.commit()
    db.refresh(holding)
    return holding


def delete_holding(db: Session, holding_id: int) -> bool:
    holding = db.get(Holding, holding_id)
    if not holding:
        return False
    # Unlink any holdings referencing this one
    db.execute(
        update(Holding)
        .where(Holding.linked_broker_holding_id == holding_id)
        .values(linked_broker_holding_id=None)
    )
    db.delete(holding)
    db.commit()
    return True


def sync_linked_holdings(db: Session, broker_holding_id: int):
    """Sync quantity and cost_price from broker holding to all linked holdings."""
    broker = db.get(Holding, broker_holding_id)
    if not broker:
        return
    linked = list(db.scalars(
        select(Holding).where(Holding.linked_broker_holding_id == broker_holding_id)
    ).all())
    now = now_beijing()
    for h in linked:
        h.quantity = broker.quantity
        h.cost_price = broker.cost_price
        h.updated_at = now
