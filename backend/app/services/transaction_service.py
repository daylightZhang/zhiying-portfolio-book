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


def rollback_transaction(db: Session, tx_id: int, account_id: int = 1) -> Transaction | None:
    """Rollback a transaction by creating a reverse operation."""
    tx = db.get(Transaction, tx_id)
    if not tx or tx.account_id != account_id:
        return None

    now = now_beijing()

    if tx.type == "BUY" and tx.holding_id:
        holding = db.get(Holding, tx.holding_id)
        if not holding:
            return None
        # Reverse BUY: reduce quantity, add cash back
        holding.quantity = max(0, holding.quantity - tx.quantity)
        multiplier = holding.contract_multiplier or 1.0
        cash_service.on_sell(db, holding.currency, tx.quantity * tx.price * multiplier, account_id)
        # Recalc cost: replay all remaining BUY transactions
        _recalc_cost(db, holding)
        reverse = Transaction(
            account_id=account_id, holding_id=tx.holding_id, type="SELL",
            quantity=tx.quantity, price=tx.price, total_amount=tx.total_amount,
            currency=tx.currency, notes=f"回滚买入 #{tx.id}", transacted_at=now,
        )

    elif tx.type == "SELL" and tx.holding_id:
        holding = db.get(Holding, tx.holding_id)
        if not holding:
            return None
        # Reverse SELL: add quantity back, deduct cash
        new_qty = holding.quantity + tx.quantity
        if new_qty > 0:
            holding.cost_price = (holding.quantity * holding.cost_price + tx.quantity * tx.price) / new_qty
        holding.quantity = new_qty
        multiplier = holding.contract_multiplier or 1.0
        cash_service.on_buy(db, holding.currency, tx.quantity * tx.price * multiplier, account_id)
        reverse = Transaction(
            account_id=account_id, holding_id=tx.holding_id, type="BUY",
            quantity=tx.quantity, price=tx.price, total_amount=tx.total_amount,
            currency=tx.currency, notes=f"回滚卖出 #{tx.id}", transacted_at=now,
        )

    elif tx.type == "DEPOSIT":
        # Reverse DEPOSIT: withdraw
        cash_service._update_balance(db, tx.currency or "CNY", -tx.price, account_id)
        reverse = Transaction(
            account_id=account_id, holding_id=None, type="WITHDRAW",
            quantity=1, price=tx.price, total_amount=tx.price,
            currency=tx.currency, notes=f"回滚入金 #{tx.id}", transacted_at=now,
        )

    elif tx.type == "WITHDRAW":
        # Reverse WITHDRAW: deposit
        cash_service._update_balance(db, tx.currency or "CNY", tx.price, account_id)
        reverse = Transaction(
            account_id=account_id, holding_id=None, type="DEPOSIT",
            quantity=1, price=tx.price, total_amount=tx.price,
            currency=tx.currency, notes=f"回滚出金 #{tx.id}", transacted_at=now,
        )

    else:
        return None

    db.add(reverse)
    if tx.holding_id:
        holding = db.get(Holding, tx.holding_id)
        if holding:
            holding.updated_at = now
    db.commit()
    db.refresh(reverse)
    return reverse


def _recalc_cost(db: Session, holding: Holding):
    """Recalculate average cost by replaying all BUY transactions."""
    txs = list(db.scalars(
        select(Transaction)
        .where(Transaction.holding_id == holding.id, Transaction.type == "BUY")
        .order_by(Transaction.transacted_at.asc())
    ).all())
    running_qty = 0.0
    running_cost = 0.0
    for t in txs:
        if running_qty + t.quantity > 0:
            running_cost = (running_qty * running_cost + t.quantity * t.price) / (running_qty + t.quantity)
        running_qty += t.quantity
    holding.cost_price = running_cost if running_qty > 0 else 0.0


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
