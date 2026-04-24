from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.cash import CashBalanceResponse, CashOperationCreate
from app.services import cash_service

router = APIRouter(prefix="/cash", tags=["cash"])


@router.get("", response_model=list[CashBalanceResponse])
def get_balances(db: Session = Depends(get_db)):
    return cash_service.get_all_balances(db)


@router.post("/deposit", response_model=CashBalanceResponse)
def deposit(data: CashOperationCreate, db: Session = Depends(get_db)):
    return cash_service.deposit(db, data.currency, data.amount, data.notes)


@router.post("/withdraw", response_model=CashBalanceResponse)
def withdraw(data: CashOperationCreate, db: Session = Depends(get_db)):
    return cash_service.withdraw(db, data.currency, data.amount, data.notes)
