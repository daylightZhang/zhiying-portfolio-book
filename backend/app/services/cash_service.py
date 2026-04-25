from datetime import datetime
from app.utils.ticker import now_beijing
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.cash_balance import CashBalance
from app.models.transaction import Transaction


def get_all_balances(db: Session) -> list[CashBalance]:
    return list(db.scalars(select(CashBalance).order_by(CashBalance.currency)).all())


def get_balance(db: Session, currency: str) -> float:
    row = db.scalar(select(CashBalance).where(CashBalance.currency == currency))
    return row.balance if row else 0.0


def _update_balance(db: Session, currency: str, delta: float):
    """Add delta to cash balance for given currency. Creates row if missing."""
    now = now_beijing()
    row = db.scalar(select(CashBalance).where(CashBalance.currency == currency))
    if row:
        row.balance += delta
        row.updated_at = now
    else:
        db.add(CashBalance(currency=currency, balance=delta, updated_at=now))


def deposit(db: Session, currency: str, amount: float, notes: str | None = None) -> CashBalance:
    now = now_beijing()
    _update_balance(db, currency, amount)

    tx = Transaction(
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

    return db.scalar(select(CashBalance).where(CashBalance.currency == currency))


def withdraw(db: Session, currency: str, amount: float, notes: str | None = None) -> CashBalance:
    now = now_beijing()
    _update_balance(db, currency, -amount)

    tx = Transaction(
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

    return db.scalar(select(CashBalance).where(CashBalance.currency == currency))


def on_buy(db: Session, currency: str, total_cost: float):
    """Called when a BUY transaction happens — reduce cash."""
    _update_balance(db, currency, -total_cost)


def on_sell(db: Session, currency: str, total_proceeds: float):
    """Called when a SELL transaction happens — add cash."""
    _update_balance(db, currency, total_proceeds)
