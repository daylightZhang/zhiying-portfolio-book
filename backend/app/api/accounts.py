from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.account import Account
from app.models.holding import Holding
from app.models.transaction import Transaction
from app.models.cash_balance import CashBalance
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.utils.ticker import now_beijing

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountResponse])
def list_accounts(db: Session = Depends(get_db)):
    return list(db.scalars(select(Account).order_by(Account.id)).all())


@router.post("", response_model=AccountResponse, status_code=201)
def create_account(data: AccountCreate, db: Session = Depends(get_db)):
    account = Account(name=data.name.strip())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.put("/{account_id}", response_model=AccountResponse)
def update_account(account_id: int, data: AccountUpdate, db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.name = data.name.strip()
    account.updated_at = now_beijing()
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    # Cascade delete all related data
    db.execute(Transaction.__table__.delete().where(Transaction.account_id == account_id))
    db.execute(Holding.__table__.delete().where(Holding.account_id == account_id))
    db.execute(CashBalance.__table__.delete().where(CashBalance.account_id == account_id))
    db.delete(account)
    db.commit()
    return {"ok": True}
