# 知盈 (ZhiYing) - 投资账本

个人投资组合追踪 Web 应用，支持多市场、多币种持仓管理与行情查询。

## 开发工作流

每次完成修改后，必须执行以下步骤：
1. 将改动记录到 `CHANGELOG.md`（版本号递增，描述新增/修改/修复内容）
2. 提交 git commit（commit message 使用 gitmoji 前缀 + 改动摘要）

### Git Commit 规范

commit message 必须使用 gitmoji 前缀表示修改类型：

| Emoji | 含义 | 场景 |
|-------|------|------|
| ✨ | 新功能 | feat |
| 🐛 | 修复 bug | fix |
| 🔧 | 配置/工具变更 | chore |
| ♻️ | 重构 | refactor |
| 💄 | UI/样式变更 | style |
| 🗃️ | 数据库相关 | db |
| ⚡ | 性能优化 | perf |
| 📝 | 文档 | docs |
| 🔥 | 删除代码/文件 | remove |
| 🚀 | 部署 | deploy |
| ✅ | 测试 | test |
| 🏷️ | 类型定义 | types |
| 🍱 | 资源文件 | assets |

示例：`✨ 新增美股IPO监测页面` `🐛 修复期货现金计算逻辑`

## 技术栈

- **后端**: Python 3 + FastAPI + SQLAlchemy 2.0 + SQLite + yfinance
- **前端**: React 19 + TypeScript + Tailwind CSS v4 + TanStack Query v5 + Vite
- **行情数据**: Yahoo Finance (通过 yfinance 库)
- **汇率**: USD 中间价机制，支持 CNY/USD/HKD/EUR/SEK 互转

## 启动命令

```bash
# 后端
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

# 前端
cd frontend && npm run dev
```

前端访问: http://localhost:5173
后端 API 文档: http://localhost:8000/docs

## 项目结构

```
zhiying-portfolio-book/
├── CLAUDE.md
├── .gitignore
├── logo.png                      # 项目 Logo
├── data/                         # SQLite 数据库 (gitignored)
│
├── backend/
│   ├── requirements.txt          # Python 依赖
│   ├── .venv/                    # Python 虚拟环境
│   └── app/
│       ├── main.py               # FastAPI 入口，CORS，路由注册
│       ├── config.py             # 配置 (DATABASE_URL, CORS_ORIGINS)
│       ├── database.py           # SQLAlchemy engine, session, Base
│       ├── models/               # 数据库模型
│       │   ├── holding.py        # 持仓表
│       │   ├── transaction.py    # 交易记录表
│       │   └── exchange_rate.py  # 汇率表
│       ├── schemas/              # Pydantic 请求/响应模型
│       │   ├── holding.py
│       │   ├── transaction.py
│       │   └── portfolio.py
│       ├── api/                  # API 路由
│       │   ├── holdings.py       # 持仓 CRUD
│       │   ├── transactions.py   # 交易记录
│       │   ├── market_data.py    # 行情刷新
│       │   └── portfolio.py      # 总览聚合 + 汇率
│       ├── services/             # 业务逻辑
│       │   ├── holding_service.py
│       │   ├── transaction_service.py
│       │   ├── market_data_service.py  # yfinance 批量获取 + 单个回退
│       │   └── currency_service.py     # USD 中间价汇率转换
│       └── utils/
│           └── ticker.py         # Market/Currency 枚举，市场映射
│
└── frontend/
    ├── package.json
    ├── vite.config.ts            # Vite + Tailwind + API 代理
    ├── index.html
    └── src/
        ├── main.tsx              # React 入口，QueryClient，BrowserRouter
        ├── App.tsx               # 路由: / /holdings /history
        ├── index.css             # Tailwind + 自定义主题色
        ├── api/                  # Axios API 调用
        │   ├── client.ts         # baseURL: /api/v1
        │   ├── holdings.ts
        │   ├── transactions.ts
        │   └── portfolio.ts
        ├── types/                # TypeScript 类型
        ├── hooks/                # React Query hooks
        │   ├── useHoldings.ts
        │   ├── usePortfolio.ts
        │   └── useTransactions.ts
        ├── pages/
        │   ├── DashboardPage.tsx # 总览: 资产总值、盈亏、分布图
        │   ├── HoldingsPage.tsx  # 持仓管理: CRUD、市场筛选
        │   └── HistoryPage.tsx   # 交易记录: 筛选、列表
        └── components/
            ├── layout/           # AppLayout, Sidebar
            ├── dashboard/        # PortfolioSummaryCard, HoldingsTable, MarketBreakdownChart, CurrencySelector
            ├── holdings/         # HoldingForm, MarketBadge
            ├── transactions/     # TransactionList
            └── common/           # GainLossText, LoadingSpinner, EmptyState, ConfirmDialog

```

## API 端点 (前缀 /api/v1)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/holdings` | 持仓列表 / 创建持仓 |
| GET/PUT/DELETE | `/holdings/{id}` | 单个持仓操作 |
| GET/POST | `/transactions` | 交易记录列表 / 新增记录 |
| POST | `/market-data/refresh` | 批量刷新所有持仓行情 |
| POST | `/market-data/refresh/{symbol}` | 刷新单个标的行情 |
| GET | `/market-data/quote/{symbol}` | 临时查询报价 |
| GET | `/portfolio/summary?base_currency=CNY` | 总览聚合数据 |
| POST | `/portfolio/exchange-rates/refresh` | 刷新汇率 |
| GET | `/portfolio/exchange-rates` | 查看缓存汇率 |

## 支持的市场

| 市场 | 代码格式 | 币种 |
|------|----------|------|
| A股(沪) | 600519.SS | CNY |
| A股(深) | 000858.SZ | CNY |
| 港股 | 0700.HK | HKD |
| 美股 | AAPL | USD |
| 法股 | MC.PA | EUR |
| 瑞典股 | VOLV-B.ST | SEK |
| 期货 | GC=F, CL=F | USD |

## 设计规范

- **主题**: 深蓝暗色主题，背景 `#0a1628`，卡片 `#111d33`，强调色 `#3b82f6`
- **涨跌颜色**: 红涨 (`#ef4444`) 绿跌 (`#22c55e`)，遵循中国市场惯例
- **字体**: Inter + PingFang SC + Microsoft YaHei + Noto Sans SC
- **汇率机制**: 所有汇率以 USD 为中间价存储，跨币种通过 USD 桥接计算

## 数据库

SQLite 文件位于 `data/zhiying.db`，首次启动自动创建。三张表:
- `holdings` - 持仓 (symbol+market 唯一索引)
- `transactions` - 交易记录 (holding_id 外键，级联删除)
- `exchange_rates` - 汇率缓存 (from+to 唯一索引)

## 关键业务逻辑

- 创建持仓时自动生成 BUY 交易记录
- 买入成本采用加权平均法: `新成本 = (旧数量*旧成本 + 新数量*新价格) / 总数量`
- 卖出不改变成本价，仅减少数量
- 行情通过 yfinance 批量获取，失败时逐个回退
- 汇率有 30 分钟内存缓存
