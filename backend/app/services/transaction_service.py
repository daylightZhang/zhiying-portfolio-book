from datetime import datetime
from app.utils.ticker import now_beijing
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.holding import Holding
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate
from app.services import cash_service


def _build_tx_filter(
    account_id: int,
    holding_id: int | None = None,
    tx_type: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
):
    """Build common WHERE clauses for transaction queries."""
    from sqlalchemy import and_
    conditions = [Transaction.account_id == account_id]
    if holding_id:
        conditions.append(Transaction.holding_id == holding_id)
    if tx_type:
        conditions.append(Transaction.type == tx_type)
    if start_date:
        conditions.append(Transaction.transacted_at >= start_date)
    if end_date:
        conditions.append(Transaction.transacted_at <= end_date + " 23:59:59")
    return and_(*conditions)


def get_transactions(
    db: Session,
    holding_id: int | None = None,
    tx_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
    account_id: int = 1,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[Transaction]:
    where = _build_tx_filter(account_id, holding_id, tx_type, start_date, end_date)
    stmt = select(Transaction).where(where).order_by(Transaction.transacted_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt).all())


def create_transaction(db: Session, data: TransactionCreate, account_id: int = 1) -> Transaction | None:
    if data.holding_id is None:
        return None

    holding = db.get(Holding, data.holding_id)
    if not holding:
        return None

    multiplier = holding.contract_multiplier or 1.0
    trade_amount = data.quantity * data.price * multiplier

    tx = Transaction(
        account_id=account_id,
        holding_id=data.holding_id,
        type=data.type.value,
        quantity=data.quantity,
        price=data.price,
        total_amount=data.quantity * data.price,
        currency=holding.currency,
        notes=data.notes,
        transacted_at=data.transacted_at or now_beijing(),
    )
    db.add(tx)

    if data.type.value == "BUY":
        new_qty = holding.quantity + data.quantity
        if new_qty > 0:
            holding.cost_price = (holding.quantity * holding.cost_price + data.quantity * data.price) / new_qty
        holding.quantity = new_qty
        cash_service.on_buy(db, holding.currency, trade_amount, account_id)
    elif data.type.value == "SELL":
        holding.quantity = max(0, holding.quantity - data.quantity)
        cash_service.on_sell(db, holding.currency, trade_amount, account_id)
    elif data.type.value == "ADJUST":
        holding.quantity = data.quantity
        holding.cost_price = data.price

    holding.updated_at = now_beijing()
    db.commit()
    db.refresh(tx)
    return tx


def count_transactions(
    db: Session,
    holding_id: int | None = None,
    tx_type: str | None = None,
    account_id: int = 1,
    start_date: str | None = None,
    end_date: str | None = None,
) -> int:
    from sqlalchemy import func
    where = _build_tx_filter(account_id, holding_id, tx_type, start_date, end_date)
    return db.scalar(select(func.count()).select_from(Transaction).where(where)) or 0
