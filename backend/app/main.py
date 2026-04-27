from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.api import holdings, transactions, market_data, portfolio, cash, accounts


def _migrate_db():
    """Lightweight migration: add new columns and migrate old market values."""
    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        # Ensure accounts table exists with default account
        if "accounts" in tables:
            has_default = conn.execute(text("SELECT id FROM accounts WHERE id = 1")).fetchone()
            if not has_default:
                conn.execute(text("INSERT INTO accounts (id, name) VALUES (1, '默认账户')"))
        else:
            # accounts table will be created by create_all, but insert default
            conn.execute(text("INSERT OR IGNORE INTO accounts (id, name) VALUES (1, '默认账户')"))

        if "holdings" in tables:
            columns = [c["name"] for c in inspector.get_columns("holdings")]
            if "holding_ratio" not in columns:
                conn.execute(text("ALTER TABLE holdings ADD COLUMN holding_ratio REAL NOT NULL DEFAULT 1.0"))
            if "contract_multiplier" not in columns:
                conn.execute(text("ALTER TABLE holdings ADD COLUMN contract_multiplier REAL NOT NULL DEFAULT 1.0"))
            if "margin_rate" not in columns:
                conn.execute(text("ALTER TABLE holdings ADD COLUMN margin_rate REAL NOT NULL DEFAULT 0.0"))
            conn.execute(text("UPDATE holdings SET market = 'A_SHARE' WHERE market IN ('A_SHARE_SH', 'A_SHARE_SZ')"))
            conn.execute(text("UPDATE holdings SET market = 'CN_FUTURES' WHERE market = 'FUTURES'"))

            # Rebuild if missing account_id or has old unique constraint
            schema_sql = conn.execute(text("SELECT sql FROM sqlite_master WHERE name='holdings'")).fetchone()[0]
            needs_rebuild = "account_id" not in columns or "UNIQUE" in schema_sql

            if needs_rebuild:
                conn.execute(text("""
                    CREATE TABLE holdings_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        account_id INTEGER NOT NULL DEFAULT 1,
                        symbol VARCHAR(20) NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        market VARCHAR(20) NOT NULL,
                        quantity REAL NOT NULL DEFAULT 0,
                        cost_price REAL NOT NULL DEFAULT 0,
                        currency VARCHAR(3) NOT NULL,
                        current_price REAL,
                        price_updated_at TIMESTAMP,
                        holding_ratio REAL NOT NULL DEFAULT 1.0,
                        contract_multiplier REAL NOT NULL DEFAULT 1.0,
                        margin_rate REAL NOT NULL DEFAULT 0.0,
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
                    )
                """))
                # Copy data, filling account_id=1 for rows that don't have it
                old_cols = [c["name"] for c in inspector.get_columns("holdings")]
                if "account_id" in old_cols:
                    conn.execute(text("""
                        INSERT INTO holdings_new (id, account_id, symbol, name, market, quantity, cost_price, currency,
                            current_price, price_updated_at, holding_ratio, contract_multiplier, margin_rate, notes, created_at, updated_at)
                        SELECT id, account_id, symbol, name, market, quantity, cost_price, currency,
                            current_price, price_updated_at,
                            COALESCE(holding_ratio, 1.0), COALESCE(contract_multiplier, 1.0), COALESCE(margin_rate, 0.0),
                            notes, created_at, updated_at FROM holdings
                    """))
                else:
                    conn.execute(text("""
                        INSERT INTO holdings_new (id, account_id, symbol, name, market, quantity, cost_price, currency,
                            current_price, price_updated_at, holding_ratio, contract_multiplier, margin_rate, notes, created_at, updated_at)
                        SELECT id, 1, symbol, name, market, quantity, cost_price, currency,
                            current_price, price_updated_at,
                            COALESCE(holding_ratio, 1.0), COALESCE(contract_multiplier, 1.0), COALESCE(margin_rate, 0.0),
                            notes, created_at, updated_at FROM holdings
                    """))
                conn.execute(text("DROP TABLE holdings"))
                conn.execute(text("ALTER TABLE holdings_new RENAME TO holdings"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_holdings_account_id ON holdings(account_id)"))

        if "transactions" in tables:
            tx_cols = {c["name"]: c for c in inspector.get_columns("transactions")}
            holding_id_nullable = tx_cols.get("holding_id", {}).get("nullable", True)
            if "currency" not in tx_cols or not holding_id_nullable:
                conn.execute(text("""
                    CREATE TABLE transactions_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        account_id INTEGER NOT NULL DEFAULT 1,
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
                    INSERT INTO transactions_new (id, account_id, holding_id, type, quantity, price, total_amount, notes, transacted_at, created_at)
                    SELECT id, 1, holding_id, type, quantity, price, total_amount, notes, transacted_at, created_at FROM transactions
                """))
                conn.execute(text("DROP TABLE transactions"))
                conn.execute(text("ALTER TABLE transactions_new RENAME TO transactions"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_holding_id ON transactions(holding_id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_transacted_at ON transactions(transacted_at)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_account_id ON transactions(account_id)"))
            elif "account_id" not in tx_cols:
                conn.execute(text("ALTER TABLE transactions ADD COLUMN account_id INTEGER NOT NULL DEFAULT 1"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_account_id ON transactions(account_id)"))

        if "cash_balances" in tables:
            cb_cols = [c["name"] for c in inspector.get_columns("cash_balances")]
            cb_schema = conn.execute(text("SELECT sql FROM sqlite_master WHERE name='cash_balances'")).fetchone()[0]
            cb_needs_rebuild = "account_id" not in cb_cols or "uq_cash_currency" in cb_schema

            if cb_needs_rebuild:
                conn.execute(text("""
                    CREATE TABLE cash_balances_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        account_id INTEGER NOT NULL DEFAULT 1,
                        currency VARCHAR(3) NOT NULL,
                        balance REAL NOT NULL DEFAULT 0,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                        CONSTRAINT uq_account_currency UNIQUE (account_id, currency)
                    )
                """))
                if "account_id" in cb_cols:
                    conn.execute(text("""
                        INSERT INTO cash_balances_new (id, account_id, currency, balance, updated_at)
                        SELECT id, account_id, currency, balance, updated_at FROM cash_balances
                    """))
                else:
                    conn.execute(text("""
                        INSERT INTO cash_balances_new (id, account_id, currency, balance, updated_at)
                        SELECT id, 1, currency, balance, updated_at FROM cash_balances
                    """))
                conn.execute(text("DROP TABLE cash_balances"))
                conn.execute(text("ALTER TABLE cash_balances_new RENAME TO cash_balances"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cash_balances_account_id ON cash_balances(account_id)"))

        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate_db()
    yield


app = FastAPI(title="知盈 ZhiYing", version="1.6.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router, prefix="/api/v1")
app.include_router(holdings.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(market_data.router, prefix="/api/v1")
app.include_router(portfolio.router, prefix="/api/v1")
app.include_router(cash.router, prefix="/api/v1")


@app.get("/api/health")
def health():
    return {"status": "ok"}
