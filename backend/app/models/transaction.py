from datetime import datetime
from sqlalchemy import String, Float, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.ticker import now_beijing


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts.id"), nullable=False, default=1, index=True)
    holding_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("holdings.id", ondelete="CASCADE"), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    transacted_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_beijing)

    holding: Mapped["Holding | None"] = relationship(back_populates="transactions")  # noqa: F821
