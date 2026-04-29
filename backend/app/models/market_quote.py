from datetime import datetime
from sqlalchemy import String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MarketQuote(Base):
    __tablename__ = "market_quotes"

    symbol: Mapped[str] = mapped_column(String(20), primary_key=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
