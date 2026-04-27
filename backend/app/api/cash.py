from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.cash import CashBalanceResponse, CashOperationCreate
from app.services import cash_service

router = APIRouter(prefix="/cash", tags=["cash"])


@router.get("", response_model=list[CashBalanceResponse])
def get_balances(account_id: int = Query(default=1), db: Session = Depends(get_db)):
    return cash_service.get_all_balances(db, account_id)


@router.post("/deposit", response_model=CashBalanceResponse)
def deposit(data: CashOperationCreate, account_id: int = Query(default=1), db: Session = Depends(get_db)):
    return cash_service.deposit(db, data.currency, data.amount, data.notes, account_id)


@router.post("/withdraw", response_model=CashBalanceResponse)
def withdraw(data: CashOperationCreate, account_id: int = Query(default=1), db: Session = Depends(get_db)):
    return cash_service.withdraw(db, data.currency, data.amount, data.notes, account_id)
