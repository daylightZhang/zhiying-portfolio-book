from datetime import datetime
from sqlalchemy import String, Float, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils.ticker import now_beijing


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    __table_args__ = (UniqueConstraint("from_currency", "to_currency", name="uq_currency_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    from_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    to_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    rate: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_beijing, onupdate=now_beijing)
