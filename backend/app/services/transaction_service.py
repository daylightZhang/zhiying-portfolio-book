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

    # Linked holdings are read-only
    if holding.linked_broker_holding_id is not None:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="无法对关联持仓进行交易操作")

    multiplier = holding.contract_multiplier or 1.0
    if holding.market == "CN_FUTURES":
        margin_rate = holding.margin_rate or 0.12
        ratio = holding.holding_ratio or 1.0
        trade_amount = data.quantity * data.price * multiplier * margin_rate * ratio
    else:
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

    # Sync linked holdings if this is a broker account holding
    from app.models.account import Account
    from app.services.holding_service import sync_linked_holdings
    acct = db.get(Account, account_id)
    if acct and acct.type == "broker":
        sync_linked_holdings(db, holding.id)
        # Adjust cash in linked portfolio accounts proportionally + create records
        if data.type.value in ("BUY", "SELL"):
            linked = list(db.scalars(
                select(Holding).where(Holding.linked_broker_holding_id == holding.id)
            ).all())
            now = now_beijing()
            for lh in linked:
                linked_amount = trade_amount * (lh.holding_ratio or 1.0)
                if data.type.value == "BUY":
                    cash_service.on_buy(db, holding.currency, linked_amount, lh.account_id)
                    db.add(Transaction(
                        account_id=lh.account_id, holding_id=None, type="WITHDRAW",
                        quantity=1, price=linked_amount, total_amount=linked_amount,
                        currency=holding.currency, transacted_at=now,
                        notes=f"关联买入 {holding.symbol} ({data.quantity}股×{data.price}×{lh.holding_ratio:.2%})",
                    ))
                else:
                    cash_service.on_sell(db, holding.currency, linked_amount, lh.account_id)
                    db.add(Transaction(
                        account_id=lh.account_id, holding_id=None, type="DEPOSIT",
                        quantity=1, price=linked_amount, total_amount=linked_amount,
                        currency=holding.currency, transacted_at=now,
                        notes=f"关联卖出 {holding.symbol} ({data.quantity}股×{data.price}×{lh.holding_ratio:.2%})",
                    ))

    db.commit()
    db.refresh(tx)
    return tx


def delete_transaction(db: Session, tx_id: int, account_id: int = 1) -> bool:
    """Delete a transaction and reverse its effects on holdings and cash."""
    tx = db.get(Transaction, tx_id)
    if not tx or tx.account_id != account_id:
        return False

    now = now_beijing()

    if tx.type == "BUY" and tx.holding_id:
        holding = db.get(Holding, tx.holding_id)
        if holding:
            holding.quantity = max(0, holding.quantity - tx.quantity)
            multiplier = holding.contract_multiplier or 1.0
            if holding.market == "CN_FUTURES":
                cash_amt = tx.quantity * tx.price * multiplier * (holding.margin_rate or 0.12) * (holding.holding_ratio or 1.0)
            else:
                cash_amt = tx.quantity * tx.price * multiplier
            cash_service.on_sell(db, holding.currency, cash_amt, account_id)
            holding.updated_at = now

    elif tx.type == "SELL" and tx.holding_id:
        holding = db.get(Holding, tx.holding_id)
        if holding:
            holding.quantity = holding.quantity + tx.quantity
            multiplier = holding.contract_multiplier or 1.0
            if holding.market == "CN_FUTURES":
                cash_amt = tx.quantity * tx.price * multiplier * (holding.margin_rate or 0.12) * (holding.holding_ratio or 1.0)
            else:
                cash_amt = tx.quantity * tx.price * multiplier
            cash_service.on_buy(db, holding.currency, cash_amt, account_id)
            holding.updated_at = now

    elif tx.type == "ADJUST" and tx.holding_id:
        holding = db.get(Holding, tx.holding_id)
        if holding and tx.notes:
            # Parse "Adjusted from qty=X, cost=Y" to restore previous state
            import re
            m = re.search(r'qty=([\d.]+),\s*cost=([\d.]+)', tx.notes)
            if m:
                holding.quantity = float(m.group(1))
                holding.cost_price = float(m.group(2))
                holding.updated_at = now

    elif tx.type == "DEPOSIT":
        cash_service._update_balance(db, tx.currency or "CNY", -tx.price, account_id)

    elif tx.type == "WITHDRAW":
        cash_service._update_balance(db, tx.currency or "CNY", tx.price, account_id)

    # For BUY/SELL on broker holdings, reverse linked portfolio effects
    if tx.holding_id and tx.type in ("BUY", "SELL"):
        holding = db.get(Holding, tx.holding_id)
        if holding:
            from app.models.account import Account
            from app.services.holding_service import sync_linked_holdings
            acct = db.get(Account, account_id)
            if acct and acct.type == "broker":
                sync_linked_holdings(db, holding.id)
                multiplier = holding.contract_multiplier or 1.0
                trade_amount = tx.quantity * tx.price * multiplier
                linked = list(db.scalars(
                    select(Holding).where(Holding.linked_broker_holding_id == holding.id)
                ).all())
                for lh in linked:
                    linked_amount = trade_amount * (lh.holding_ratio or 1.0)
                    if tx.type == "BUY":
                        cash_service.on_sell(db, holding.currency, linked_amount, lh.account_id)
                    else:
                        cash_service.on_buy(db, holding.currency, linked_amount, lh.account_id)

    # Save holding_id and type before deleting (object may become detached)
    tx_holding_id = tx.holding_id
    tx_type = tx.type

    # Delete the transaction record and flush so _recalc_cost won't see it
    db.delete(tx)
    db.flush()

    # Recalc cost for the holding after deletion
    if tx_holding_id and tx_type in ("BUY", "SELL"):
        holding = db.get(Holding, tx_holding_id)
        if holding:
            _recalc_cost(db, holding)

    db.commit()
    return True


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
