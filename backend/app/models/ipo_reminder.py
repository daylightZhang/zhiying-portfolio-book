from sqlalchemy import String, Integer, Float, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.database import Base


class IPOReminder(Base):
    __tablename__ = "ipo_reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    listing_date: Mapped[str] = mapped_column(String(10), nullable=False)  # "2026-05-10"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class IPOStock(Base):
    __tablename__ = "ipo_stocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    listing_date: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    price: Mapped[str] = mapped_column(String(20), nullable=False, default="--")
    ipo_price: Mapped[str] = mapped_column(String(20), nullable=False, default="--")
    first_day_change: Mapped[str] = mapped_column(String(20), nullable=False, default="--")
    cumulative_change: Mapped[str] = mapped_column(String(20), nullable=False, default="--")
    market_cap: Mapped[str] = mapped_column(String(30), nullable=False, default="--")
    industry: Mapped[str] = mapped_column(String(50), nullable=False, default="--")
    status: Mapped[str] = mapped_column(String(10), nullable=False)  # "listed" | "upcoming"
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
