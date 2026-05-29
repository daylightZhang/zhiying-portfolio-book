from datetime import datetime
from sqlalchemy import String, Float, DateTime, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils.ticker import now_beijing


class CashBalance(Base):
    __tablename__ = "cash_balances"
    __table_args__ = (UniqueConstraint("account_id", "currency", name="uq_account_currency"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts.id"), nullable=False, default=1, index=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    balance: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_beijing, onupdate=now_beijing)
