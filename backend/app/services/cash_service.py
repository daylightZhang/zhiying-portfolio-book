from datetime import datetime
from app.utils.ticker import now_beijing
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.cash_balance import CashBalance
from app.models.transaction import Transaction


def get_all_balances(db: Session, account_id: int = 1) -> list[CashBalance]:
    return list(db.scalars(
        select(CashBalance).where(CashBalance.account_id == account_id).order_by(CashBalance.currency)
    ).all())


def get_balance(db: Session, currency: str, account_id: int = 1) -> float:
    row = db.scalar(select(CashBalance).where(
        and_(CashBalance.account_id == account_id, CashBalance.currency == currency)
    ))
    return row.balance if row else 0.0


def _update_balance(db: Session, currency: str, delta: float, account_id: int = 1):
    """Add delta to cash balance for given currency. Creates row if missing."""
    now = now_beijing()
    row = db.scalar(select(CashBalance).where(
        and_(CashBalance.account_id == account_id, CashBalance.currency == currency)
    ))
    if row:
        row.balance += delta
        row.updated_at = now
    else:
        db.add(CashBalance(account_id=account_id, currency=currency, balance=delta, updated_at=now))


def deposit(db: Session, currency: str, amount: float, notes: str | None = None, account_id: int = 1) -> CashBalance:
    now = now_beijing()
    _update_balance(db, currency, amount, account_id)

    tx = Transaction(
        account_id=account_id,
        holding_id=None,
        type="DEPOSIT",
        quantity=1,
        price=amount,
        total_amount=amount,
        currency=currency,
        notes=notes,
        transacted_at=now,
    )
    db.add(tx)
    db.commit()

    return db.scalar(select(CashBalance).where(
        and_(CashBalance.account_id == account_id, CashBalance.currency == currency)
    ))


def withdraw(db: Session, currency: str, amount: float, notes: str | None = None, account_id: int = 1) -> CashBalance:
    now = now_beijing()
    _update_balance(db, currency, -amount, account_id)

    tx = Transaction(
        account_id=account_id,
        holding_id=None,
        type="WITHDRAW",
        quantity=1,
        price=amount,
        total_amount=amount,
        currency=currency,
        notes=notes,
        transacted_at=now,
    )
    db.add(tx)
    db.commit()

    return db.scalar(select(CashBalance).where(
        and_(CashBalance.account_id == account_id, CashBalance.currency == currency)
    ))


def on_buy(db: Session, currency: str, total_cost: float, account_id: int = 1):
    """Called when a BUY transaction happens — reduce cash."""
    _update_balance(db, currency, -total_cost, account_id)


def on_sell(db: Session, currency: str, total_proceeds: float, account_id: int = 1):
    """Called when a SELL transaction happens — add cash."""
    _update_balance(db, currency, total_proceeds, account_id)
