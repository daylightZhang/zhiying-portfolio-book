from datetime import datetime
from sqlalchemy import String, Float, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CashBalance(Base):
    __tablename__ = "cash_balances"
    __table_args__ = (UniqueConstraint("currency", name="uq_cash_currency"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    balance: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
