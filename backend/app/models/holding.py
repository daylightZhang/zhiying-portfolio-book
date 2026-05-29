from datetime import datetime
from sqlalchemy import String, Float, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.ticker import now_beijing


class Holding(Base):
    __tablename__ = "holdings"
    __table_args__: tuple = ()

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts.id"), nullable=False, default=1, index=True)
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
    margin_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0.0")
    linked_broker_holding_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_beijing)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_beijing, onupdate=now_beijing)

    transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        back_populates="holding", cascade="all, delete-orphan", order_by="Transaction.transacted_at.desc()"
    )
