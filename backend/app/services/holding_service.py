from datetime import datetime
from app.utils.ticker import now_beijing
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.holding import Holding
from app.models.transaction import Transaction
from app.schemas.holding import HoldingCreate, HoldingUpdate
from app.utils.ticker import MARKET_CURRENCY_MAP, Market, Currency


def get_all_holdings(db: Session, market: str | None = None) -> list[Holding]:
    stmt = select(Holding)
    if market:
        stmt = stmt.where(Holding.market == market)
    stmt = stmt.order_by(Holding.market, Holding.symbol)
    return list(db.scalars(stmt).all())


def get_holding(db: Session, holding_id: int) -> Holding | None:
    return db.get(Holding, holding_id)


def create_holding(db: Session, data: HoldingCreate) -> Holding:
    currency = data.currency or MARKET_CURRENCY_MAP.get(data.market, Currency.USD)
    now = now_beijing()
    transacted_at = data.transacted_at or now

    # A股和中国期货代码不做大写转换
    if data.market in (Market.A_SHARE, Market.CN_FUTURES):
        symbol = data.symbol.strip()
    else:
        symbol = data.symbol.strip().upper()

    holding = Holding(
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

    tx = Transaction(
        holding_id=holding.id,
        type="BUY",
        quantity=data.quantity,
        price=data.cost_price,
        total_amount=data.quantity * data.cost_price,
        transacted_at=transacted_at,
    )
    db.add(tx)
    db.commit()
    db.refresh(holding)
    return holding


def update_holding(db: Session, holding_id: int, data: HoldingUpdate) -> Holding | None:
    holding = db.get(Holding, holding_id)
    if not holding:
        return None

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

    if data.quantity is not None or data.cost_price is not None:
        new_qty = data.quantity if data.quantity is not None else holding.quantity
        new_cost = data.cost_price if data.cost_price is not None else holding.cost_price

        tx = Transaction(
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

    holding.updated_at = now_beijing()
    db.commit()
    db.refresh(holding)
    return holding


def delete_holding(db: Session, holding_id: int) -> bool:
    holding = db.get(Holding, holding_id)
    if not holding:
        return False
    db.delete(holding)
    db.commit()
    return True
