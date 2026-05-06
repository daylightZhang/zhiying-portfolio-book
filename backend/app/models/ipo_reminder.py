from sqlalchemy import String, Integer, DateTime
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
