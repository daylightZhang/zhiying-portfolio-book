from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.api import holdings, transactions, market_data, portfolio, cash


def _migrate_db():
    """Lightweight migration: add new columns and migrate old market values."""
    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "holdings" in tables:
            columns = [c["name"] for c in inspector.get_columns("holdings")]
            if "holding_ratio" not in columns:
                conn.execute(text("ALTER TABLE holdings ADD COLUMN holding_ratio REAL NOT NULL DEFAULT 1.0"))
            if "contract_multiplier" not in columns:
                conn.execute(text("ALTER TABLE holdings ADD COLUMN contract_multiplier REAL NOT NULL DEFAULT 1.0"))
            conn.execute(text("UPDATE holdings SET market = 'A_SHARE' WHERE market IN ('A_SHARE_SH', 'A_SHARE_SZ')"))
            conn.execute(text("UPDATE holdings SET market = 'CN_FUTURES' WHERE market = 'FUTURES'"))

        if "transactions" in tables:
            tx_cols = {c["name"]: c for c in inspector.get_columns("transactions")}
            holding_id_nullable = tx_cols.get("holding_id", {}).get("nullable", True)
            if "currency" not in tx_cols or not holding_id_nullable:
                # SQLite can't alter NOT NULL, so recreate the table
                conn.execute(text("""
                    CREATE TABLE transactions_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        holding_id INTEGER REFERENCES holdings(id) ON DELETE CASCADE,
                        type VARCHAR(10) NOT NULL,
                        quantity REAL NOT NULL,
                        price REAL NOT NULL,
                        total_amount REAL NOT NULL,
                        currency VARCHAR(3),
                        notes TEXT,
                        transacted_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                conn.execute(text("""
                    INSERT INTO transactions_new (id, holding_id, type, quantity, price, total_amount, notes, transacted_at, created_at)
                    SELECT id, holding_id, type, quantity, price, total_amount, notes, transacted_at, created_at FROM transactions
                """))
                conn.execute(text("DROP TABLE transactions"))
                conn.execute(text("ALTER TABLE transactions_new RENAME TO transactions"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_holding_id ON transactions(holding_id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_transacted_at ON transactions(transacted_at)"))

        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate_db()
    yield


app = FastAPI(title="知盈 ZhiYing", version="1.4.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(holdings.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(market_data.router, prefix="/api/v1")
app.include_router(portfolio.router, prefix="/api/v1")
app.include_router(cash.router, prefix="/api/v1")


@app.get("/api/health")
def health():
    return {"status": "ok"}
