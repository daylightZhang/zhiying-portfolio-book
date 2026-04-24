from datetime import datetime
from sqlalchemy import String, Float, DateTime, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Holding(Base):
    __tablename__ = "holdings"
    __table_args__ = (UniqueConstraint("symbol", "market", name="uq_symbol_market"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    market: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    cost_price: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    current_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    holding_ratio: Mapped[float] = mapped_column(Float, nullable=False, default=1.0, server_default="1.0")
    contract_multiplier: Mapped[float] = mapped_column(Float, nullable=False, default=1.0, server_default="1.0")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        back_populates="holding", cascade="all, delete-orphan", order_by="Transaction.transacted_at.desc()"
    )
