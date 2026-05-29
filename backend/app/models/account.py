from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils.ticker import now_beijing


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="portfolio", server_default="portfolio")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_beijing)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_beijing, onupdate=now_beijing)
