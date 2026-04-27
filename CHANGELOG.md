# 知盈 (ZhiYing) 变更记录

## 2026-04-27 v1.6.0 - 多账户 + 设置页面 + 价格精度

### 新增
- **多账户支持**: 侧边栏下拉切换账户，无需登录认证
  - 新建 `accounts` 表，默认创建"默认账户" (id=1)
  - `holdings`、`transactions`、`cash_balances` 三张表加 `account_id` 列
  - 所有 API 端点和 Service 层按 account_id 隔离数据
  - 前端 AccountContext 贯穿所有 hooks 和 API 调用
  - 侧边栏账户选择器: 切换/新建/删除账户
- **设置弹窗**: 侧边栏底部"设置"按钮，全屏居中弹窗
  - 修改账户名称
  - 主题切换 (从侧边栏底部移入设置弹窗，2×2 网格展示)
  - 预留扩展区域

### 修改
- **持仓明细价格精度**: 成本价和现价显示 3 位小数

### 新文件
- `backend/app/models/account.py`, `backend/app/schemas/account.py`, `backend/app/api/accounts.py`
- `frontend/src/api/accounts.ts`, `frontend/src/hooks/useAccount.ts`
- `frontend/src/components/layout/SettingsDialog.tsx`

---

## 2026-04-27 v1.5.2 - 期货保证金计算

### 新增
- **保证金比例 (margin_rate)**: 期货持仓新增保证金比例字段
  - 建仓时根据品种自动填充 (IF:12%, IC:14%, IH:12%, IM:15%, T/TF:2%, TS:2%)
  - 数据库新增 `margin_rate` 列，启动时自动迁移

### 修改
- **期货资产计算改为保证金模式**:
  - 保证金占用 = 数量 × 成本价 × 合约乘数 × 保证金比例 × 持有比例
  - 浮动盈亏 = (现价 - 成本价) × 合约乘数 × 数量 × 持有比例
  - 市值 = 保证金占用 + 浮动盈亏 (原为合约全额市值)
  - 已实现盈亏同样乘以持有比例
- 非期货资产计算不受影响

---

## 2026-04-27 v1.5.1 - A股ETF行情支持

### 修复
- **A股ETF取不到行情**: 513310、515880、159513 等 ETF 代码无法获取价格
  - 原因: AKShare 的 `stock_bid_ask_em` / `stock_zh_a_hist` 只支持普通股票，不支持 ETF
  - 新增 `_is_etf_symbol()` 检测 ETF 代码 (51x/56x/58x/50x/159x 开头)
  - ETF 优先使用 `fund_etf_hist_em` 获取历史收盘价
  - 新增 `_a_share_to_yahoo()` 将 A 股代码转为 Yahoo 格式 (沪→.SS，深→.SZ)
  - **A 股回退链**: AKShare (股票/ETF 各自接口) → finance-query.com (Yahoo 格式)
  - 批量刷新和单个刷新均支持回退

---

## 2026-04-26 v1.5.0 - 时间修复 + 行情并发优化 + 刷新反馈

### 修复
- **北京时间修复**: 后端所有时间戳从 UTC 改为北京时间 (UTC+8)
  - 新增 `now_beijing()` 工具函数，替换全部 6 个 service 文件中的 `datetime.now(timezone.utc)`
  - 数据库直接存储北京时间，前端不再做时区转换
  - 前端 `format.ts` 简化为直接解析，不再指定 timeZone 参数

### 优化
- **行情刷新并发**: 从串行改为每个持仓一个线程并行获取 (~20s vs 原 54s)
  - 国际股票首选 finance-query.com (跳过慢的 yfinance batch)
  - finance-query timeout 从 8s 收紧到 5s，超时走 yfinance 兜底
  - 去掉易超时的 `stock_zh_a_spot_em` batch，A 股直接走 `bid_ask_em → hist` 回退

### 新增
- **刷新成功 Toast**: 右上角毛玻璃提示 "行情刷新成功: X 个更新"，3 秒自动消失
- **刷新中状态**: 按钮文字变为 "刷新中..."
- **上次刷新具体时间**: 同时显示相对时间和具体时间，如 "更新于 5分钟前 (2026/04/26 01:01)"

---

## 2026-04-26 v1.4.2 - AKShare 美股数据源

### 新增
- **AKShare 美股回退**: 美股行情新增第三回退源 `akshare stock_us_spot_em / stock_us_hist`
  - 完整回退链: yfinance → finance-query.com → akshare (东方财富源，国内网络友好)
  - batch 和 single refresh 均支持三级回退
- `_akshare_us_stock_price()` 函数: 先尝试 `stock_us_spot_em` 批量匹配，再逐个尝试 NASDAQ(105)/NYSE(106) 前缀的历史数据

---

## 2026-04-24 v1.4.1 - 新增 finance-query.com 备用数据源

### 新增
- **finance-query.com** 作为行情数据备用源 (免费，无需 API key)
  - 指数行情: 首选 finance-query → yfinance → akshare 三级回退
  - 个股行情: yfinance 失败时自动回退到 finance-query
- **指数缓存**: 10 分钟内存缓存，避免频繁请求被限流

### 修复
- 底部指数行情条因 yfinance 限流无数据不显示的问题

---

## 2026-04-24 v1.4.0 - 北京时间 + 现金管理 + UI 优化

### 新增
- **现金管理系统**: 支持多币种现金余额追踪
  - 新建 `cash_balances` 表，按币种存储余额
  - 入金/出金 API (`POST /cash/deposit`, `POST /cash/withdraw`)
  - 入金/出金记录在交易历史中展示 (类型: DEPOSIT/WITHDRAW)
  - 买入自动扣减现金，卖出自动增加现金
  - Dashboard 显示现金余额面板 (CashPanel)，支持直接入金/出金操作
  - 总资产 = 持仓市值 + 现金总值
- **刷新倒计时**: "刷新行情"按钮旁显示 `MM:SS 后刷新`，每秒递减，刷新后重置
- **PortfolioSummaryCard**: 增加持仓市值、现金、总成本、持仓盈亏四个指标

### 修改
- **北京时间**: 所有时间格式化函数加 `timeZone: 'Asia/Shanghai'`
- **"清仓"→"删除"**: 持仓管理中按钮和确认弹窗文字统一改为"删除"
- **价格带货币单位**: 总览持仓明细表的成本价和现价显示标的本身的货币符号 (如 ¥1458.49, $273.43)
- **Transaction 模型**: `holding_id` 改为 nullable (支持现金交易无 holding)，新增 `currency` 字段
- **交易记录**: 支持显示入金/出金记录，筛选器增加入金/出金选项

### 新文件
- `backend/app/models/cash_balance.py`, `backend/app/schemas/cash.py`, `backend/app/services/cash_service.py`, `backend/app/api/cash.py`
- `frontend/src/components/dashboard/CashPanel.tsx`, `CashDialog.tsx`
- `frontend/src/hooks/useCash.ts`

---

## 2026-04-24 v1.3.1 - 期货合约乘数

### 新增
- **合约乘数 (contract_multiplier)**: 期货持仓支持设置合约乘数
  - 期货市值计算: `价格 × 合约乘数 × 数量 × 持有比例`
  - 建仓时输入代码自动识别品种并填充标准乘数 (IF=300, IC=200, IH=300, IM=200, T=10000, TF=10000, TS=20000)
  - 品种提示表现在显示各品种的合约乘数
  - 非期货持仓乘数默认为 1，不影响原有计算
- **数据库**: 新增 `contract_multiplier` 列 (REAL, 默认 1.0)，启动时自动迁移

### 修改
- `portfolio.py`: 市值/成本计算公式加入 contract_multiplier
- `HoldingForm.tsx`: 期货模式下显示合约乘数输入框 + 自动填充

---

## 2026-04-24 v1.3.0 - A股合并 + 中国期货 + AKShare + 持有比例

### 新增
- **AKShare 集成**: A股和中国期货使用 AKShare 获取行情 (其他市场保留 yfinance)
  - A股: 三级回退链 `stock_zh_a_spot_em` → `stock_bid_ask_em` → `stock_zh_a_hist`
  - 中国期货: `futures_zh_spot(symbol, market="FF")` 获取中金所合约
- **持有比例 (holding_ratio)**: 建仓/编辑时可设置持有比例 (0-100%)，默认 100%
  - 市值和成本计算均乘以比例: `市值 = 数量 × 现价 × 持有比例`
  - 持仓列表和总览均展示比例

### 修改
- **市场合并**: A股(沪) + A股(深) 合并为 "A股"，代码格式 600519/000858 (无需后缀)
- **期货改为中国期货**: FUTURES → CN_FUTURES，标签 "中国期货"，币种 CNY
  - 建仓时显示中金所品种提示: IF/IC/IH/IM/T/TF/TS (含合约规则说明)
- **数据库迁移**: 启动时自动: 添加 holding_ratio 列、迁移旧 market 值 (A_SHARE_SH/SZ → A_SHARE, FUTURES → CN_FUTURES)
- **HoldingResponse/HoldingSummary schema**: market 和 currency 字段改为 str (兼容旧数据)

### 依赖
- 新增 `akshare>=1.14.0`

---

## 2026-04-24 v1.2.0 - 持仓操作增强 + UI 美化 + 指数行情条

### 新增
- **持仓操作**: 建仓/买入/卖出/清仓完整交易流程
  - `TradeDialog` 买入/卖出弹窗，显示当前持仓、实时计算交易金额
  - 清仓操作确认后删除持仓及所有交易记录
  - "添加持仓"改名为"建仓"
- **自定义下拉框 `CustomSelect`**: 替换全部 3 处原生 `<select>` (市场选择、持仓筛选、币种选择)
  - 毛玻璃背景面板，展开/收起动画，选中项带 Check 标记
- **底部指数行情条 `MarketTicker`**: 固定底部滚动显示市场指数
  - 上证指数、标普500、纳斯达克、恒生指数、恒生科技
  - 红涨绿跌配色，marquee 滚动动画
- **30 分钟自动刷新**: Dashboard 定时刷新持仓价格和汇率，指数行情条 TanStack Query 自动 refetch

### 修改
- **动画效果**: 所有弹窗加入 `scaleIn` 入场动画 + `fadeIn` 背景动画
- **毛玻璃效果**: 侧边栏、弹窗、下拉框、主题切换器、行情条均应用 `glass` 效果 (backdrop-blur)
- **卡片悬浮**: PortfolioSummaryCard、MarketBreakdownChart 加入 hover 上浮阴影效果
- **过渡动画**: 表格行、按钮、标签页等加入 `transition-all duration-200`

### 新文件
- `components/common/CustomSelect.tsx`
- `components/holdings/TradeDialog.tsx`
- `components/layout/MarketTicker.tsx`
- `hooks/useMarketIndices.ts`
- `backend/app/api/market_data.py` 新增 `/indices` 端点

---

## 2026-04-24 v1.1.0 - 多主题配色系统

### 新增
- **4 套可切换主题**: 极光(明亮蓝)、翡翠(明亮绿)、星轨(酷炫紫暗)、深海(经典蓝暗)
- **主题切换器**: 侧边栏底部 Palette 按钮，弹出主题选择面板，带渐变色预览
- **localStorage 持久化**: 主题选择刷新不丢失，index.html 内联脚本避免闪烁
- **语义化颜色系统**: 16 个 CSS 变量 token，通过 `data-theme` 属性切换

### 修改
- **index.css**: 从固定暗色 @theme 重构为 CSS 变量 + 4 套 `[data-theme]` 定义
- **index.html**: 移除 hardcoded `bg-[#0a1628]`，改为 `data-theme="aurora"` 默认
- **全部 16 个组件文件**: `text-slate-*` → `text-t-primary/secondary/muted/faint`; `border-slate-*` → `border-border/border-subtle`; `bg-black/60` → `bg-overlay`; `bg-accent-blue` → `bg-accent`
- **默认主题从暗色改为明亮高级风格** (极光 Aurora)

### 新文件
- `hooks/useTheme.ts` — 主题状态管理 + localStorage
- `components/layout/ThemeSwitcher.tsx` — 主题切换 UI 组件

---

## 2026-04-24 v1.0.0 - 项目初始化

### 新增
- **后端**: FastAPI + SQLAlchemy + SQLite 搭建完成
  - 持仓 CRUD API (`/api/v1/holdings`)
  - 交易记录 API (`/api/v1/transactions`)
  - 行情刷新 API (`/api/v1/market-data/refresh`)，通过 yfinance 批量获取
  - 总览聚合 API (`/api/v1/portfolio/summary`)，支持多币种转换
  - 汇率服务，USD 中间价机制，30 分钟缓存
- **前端**: React + TypeScript + Tailwind CSS + Vite
  - 总览页: 资产总值、盈亏展示(红涨绿跌)、市场/币种分布图、持仓明细表
  - 持仓页: 添加/编辑/删除持仓，市场筛选标签
  - 记录页: 交易历史列表，按持仓和类型筛选
  - 深蓝暗色主题，匹配 Logo 设计风格
  - 币种选择器，支持 CNY/USD/HKD/EUR/SEK
- **支持市场**: A股(沪深)、港股、美股、法股、瑞典股、期货
- **项目配置**: .gitignore, CLAUDE.md
