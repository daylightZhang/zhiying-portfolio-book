# 知盈 - 投资账本

<p align="center">
  <img src="logo.png" width="120" alt="知盈 Logo" />
</p>

<p align="center">
  个人多市场、多币种投资组合追踪工具
</p>

---

## 功能概览

- **多市场支持** — A股、港股、美股、法国股票、瑞典股票、中国金融期货 (中金所)
- **多币种现金管理** — CNY / USD / HKD / EUR / SEK，入金/出金全记录
- **实时行情** — 30 分钟自动刷新，支持手动刷新，三级数据源回退
- **资产总览** — 总资产 (持仓 + 现金)、盈亏、市场/币种分布，可切换展示币种
- **交易记录** — 建仓/买入/卖出/入金/出金全历史，按类型和持仓筛选
- **持有比例** — 支持部分持有 (如 30%)，市值按比例计算
- **期货合约乘数** — 自动识别中金所品种 (IF/IC/IH/IM/T/TF/TS) 并填充标准乘数
- **4 套主题** — 极光 (明亮蓝)、翡翠 (明亮绿)、星轨 (酷炫紫暗)、深海 (经典蓝暗)
- **底部指数行情条** — 上证指数、标普500、纳斯达克、恒生指数滚动展示
- **毛玻璃 + 动画** — 弹窗、侧边栏、下拉框全局 backdrop-blur 效果

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Tailwind CSS v4 + TanStack Query v5 + Vite |
| 后端 | Python 3 + FastAPI + SQLAlchemy 2.0 + SQLite |
| 行情数据 | AKShare (A股/中国期货) + yfinance (港股/美股/欧股) + finance-query.com (备用) |
| 汇率 | yfinance forex，USD 中间价机制 |

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 18+

### 安装与启动

```bash
# 克隆项目
git clone <repo-url> zhiying-portfolio-book
cd zhiying-portfolio-book

# 后端
cd backend
python3 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端 (另开终端)
cd frontend
npm install
npm run dev
```

打开浏览器访问 http://localhost:5173

后端 API 文档: http://localhost:8000/docs

## 支持的市场

| 市场 | 代码格式 | 币种 | 数据源 |
|------|----------|------|--------|
| A股 | `600519`, `000858`, `300750` | CNY | AKShare |
| 港股 | `0700.HK` | HKD | yfinance |
| 美股 | `AAPL`, `GOOGL` | USD | yfinance |
| 法股 | `MC.PA` | EUR | yfinance |
| 瑞典股 | `VOLV-B.ST` | SEK | yfinance |
| 中国期货 | `IF0` (主力), `IF2406` (合约) | CNY | AKShare |

### 中金所期货品种

| 代码 | 品种 | 合约乘数 |
|------|------|----------|
| IF | 沪深300股指期货 | 300 |
| IC | 中证500股指期货 | 200 |
| IH | 上证50股指期货 | 300 |
| IM | 中证1000股指期货 | 200 |
| T | 10年期国债期货 | 10,000 |
| TF | 5年期国债期货 | 10,000 |
| TS | 2年期国债期货 | 20,000 |

## 核心功能说明

### 资产计算

```
股票市值 = 数量 x 现价 x 持有比例
期货市值 = 数量 x 现价 x 合约乘数 x 持有比例
总资产   = 持仓市值 (折合展示币种) + 现金余额 (折合展示币种)
持仓盈亏 = 持仓市值 - 持仓成本
```

### 现金管理

- **入金**: 向账户注入资金，选择币种和金额
- **出金**: 从账户提取资金
- **买入**: 自动扣减对应币种现金 (`数量 x 价格 x 合约乘数`)
- **卖出**: 自动增加对应币种现金
- 所有操作均记录在交易历史中

### 涨跌颜色

遵循中国市场惯例: **红色为涨，绿色为跌**

### 行情数据源

采用多源回退策略，确保数据可用性:

| 场景 | 首选 | 回退 1 | 回退 2 |
|------|------|--------|--------|
| A股行情 | AKShare `stock_zh_a_spot_em` | AKShare `stock_bid_ask_em` | AKShare `stock_zh_a_hist` |
| 中国期货 | AKShare `futures_zh_spot` | - | - |
| 国际股票 | yfinance batch download | yfinance individual Ticker | finance-query.com |
| 市场指数 | finance-query.com | yfinance | AKShare |

## 项目结构

```
zhiying-portfolio-book/
├── logo.png
├── data/                           # SQLite 数据库 (gitignored)
│
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI 入口 + 数据库迁移
│       ├── config.py               # 配置
│       ├── database.py             # SQLAlchemy 引擎
│       ├── models/                 # 数据模型
│       │   ├── holding.py          # 持仓
│       │   ├── transaction.py      # 交易记录
│       │   ├── cash_balance.py     # 现金余额
│       │   └── exchange_rate.py    # 汇率缓存
│       ├── schemas/                # Pydantic 模型
│       ├── api/                    # API 路由
│       │   ├── holdings.py         # 持仓 CRUD
│       │   ├── transactions.py     # 交易记录
│       │   ├── market_data.py      # 行情刷新 + 指数
│       │   ├── portfolio.py        # 总览聚合 + 汇率
│       │   └── cash.py             # 现金操作
│       ├── services/               # 业务逻辑
│       │   ├── holding_service.py
│       │   ├── transaction_service.py
│       │   ├── market_data_service.py
│       │   ├── currency_service.py
│       │   └── cash_service.py
│       └── utils/
│           └── ticker.py           # 市场/币种枚举
│
└── frontend/
    └── src/
        ├── pages/                  # 总览 / 持仓 / 记录
        ├── components/
        │   ├── layout/             # AppLayout, Sidebar, MarketTicker, ThemeSwitcher
        │   ├── dashboard/          # SummaryCard, HoldingsTable, CashPanel, Charts
        │   ├── holdings/           # HoldingForm, TradeDialog, MarketBadge
        │   ├── transactions/       # TransactionList
        │   └── common/             # CustomSelect, GainLossText, ConfirmDialog
        ├── hooks/                  # React Query hooks
        ├── api/                    # Axios API 层
        ├── types/                  # TypeScript 类型
        └── utils/                  # 格式化 + 常量
```

## API 参考

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/holdings` | 持仓列表 (可按 market 筛选) |
| POST | `/holdings` | 建仓 |
| PUT | `/holdings/{id}` | 编辑持仓 |
| DELETE | `/holdings/{id}` | 删除持仓 (级联删除交易记录) |
| GET | `/transactions` | 交易记录 (可按 holding_id, type 筛选) |
| POST | `/transactions` | 新增交易 (买入/卖出) |
| POST | `/market-data/refresh` | 刷新所有持仓行情 |
| GET | `/market-data/indices` | 获取市场指数 |
| GET | `/portfolio/summary` | 资产总览 (`?base_currency=CNY`) |
| POST | `/portfolio/exchange-rates/refresh` | 刷新汇率 |
| GET | `/cash` | 各币种现金余额 |
| POST | `/cash/deposit` | 入金 |
| POST | `/cash/withdraw` | 出金 |

所有端点前缀 `/api/v1`

## 数据库

SQLite 文件存储在 `data/zhiying.db`，首次启动自动创建表和索引。后续版本升级时，`main.py` 中的迁移逻辑会自动添加新列和调整表结构，无需手动操作。

| 表 | 说明 |
|----|------|
| `holdings` | 持仓 (symbol + market 唯一) |
| `transactions` | 交易记录 (买入/卖出/调整/入金/出金) |
| `cash_balances` | 各币种现金余额 |
| `exchange_rates` | 汇率缓存 |

## 主题

侧边栏底部点击调色盘图标切换:

| 主题 | 风格 |
|------|------|
| 极光 Aurora | 明亮白底蓝色调 (默认) |
| 翡翠 Jade | 明亮暖白翠绿调 |
| 星轨 Nebula | 深紫暗底紫色光晕 |
| 深海 Abyss | 经典深蓝暗色 |

## License

Personal use.
