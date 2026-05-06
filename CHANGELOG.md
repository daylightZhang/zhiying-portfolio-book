# 知盈 (ZhiYing) 变更记录

## 2026-05-06 v1.11.0 - 美股IPO监测 + 上市提醒

### 新增
- **美股IPO监测页面**: 侧边栏新增"美股IPO"菜单项
  - 数据源: moomoo.com 新股中心页面爬取 (`__INITIAL_STATE__` 解析)
  - "已上市" / "待上市" Tab 切换
  - 展示: 代码、股票名称、上市日期、价格、发行价、首日涨幅、累计涨幅、行业
  - 按上市日期从近到远排列
  - 后端 1 小时缓存 TTL，失败时返回旧缓存
- **IPO 上市提醒**: 每只 IPO 可点击铃铛设置/取消提醒
  - 上市日期前 7 天至上市当天，左上角弹出持久提醒弹窗
  - 提醒弹窗不自动消失，必须手动关闭
  - 每条提醒每天只弹出一次（关闭后当天不再弹出）
  - 提醒弹窗与新闻提醒、Toast 通知互不干扰（独立定位）
  - 支持多条提醒同时显示（垂直堆叠）

### 数据库
- 新增 `ipo_reminders` 表 (symbol UNIQUE, name, listing_date)

### 新文件
- `backend/app/api/ipo.py` — IPO 爬取 + 提醒 API
- `backend/app/models/ipo_reminder.py` — 提醒数据模型
- `frontend/src/api/ipo.ts` — IPO API 调用
- `frontend/src/hooks/useIPO.ts` — React Query hooks
- `frontend/src/pages/IPOPage.tsx` — IPO 页面
- `frontend/src/components/common/IPOAlert.tsx` — 提醒弹窗组件

---

## 2026-04-29 v1.10.0 - 行情缓存独立表 + UI 优化

### 重构
- **行情缓存独立表 `market_quotes`**: 新建 `market_quotes` 表 (symbol PK, price, updated_at)
  - 行情刷新写入 `market_quotes`，不再更新 holdings 表的 current_price
  - portfolio summary 和 holdings API 从 `market_quotes` 读取价格
  - 所有账户共享同一份行情数据，一个 symbol 一条记录
  - `holding_service` 不再同步 current_price 到关联持仓

### 新增
- **投资账本类型标签**: 侧边栏投资账本显示蓝色"账"标签（券商账户显示橙色"券"）
- **下拉列表点击外部收起**: 账户选择器下拉列表点击外部区域自动关闭

### 数据库
- 新增 `market_quotes` 表，首次迁移自动从 holdings 已有价格填充

---

## 2026-04-29 v1.9.6 - 持仓管理数据统一用后端计算

### 修改
- **持仓管理盈亏/仓位由后端计算**: 移除前端 `holdingMarketValue`/`holdingGainLoss` 客户端计算，改用 portfolio summary 后端返回的 `gain_loss`、`gain_loss_pct`、`weight_pct`、`market_value_base`
- **期货仓位计算修正**: 后端统一使用保证金模式计算期货市值，前端不再需要重复实现
- **HoldingSummary 增加关联字段**: 后端 portfolio summary 返回 `linked_broker_holding_id` 和 `broker_account_name`

---

## 2026-04-29 v1.9.5 - 总览自动刷新数据 + 防重复刷新

### 修改
- **总览每 5 秒刷新**: portfolio summary 每 5 秒自动调用后端接口获取最新数据
- **自动刷新防重复**: 行情刷新中时不再重复触发刷新请求

---

## 2026-04-29 v1.9.4 - 建仓扣现金 + 行情存储修复 + 仓位基数修复

### 修复
- **建仓扣减现金**: `create_holding` 建仓时调用 `cash_service.on_buy` 扣减现金，并为 BUY 交易记录写入 currency 字段
- **行情存储放宽**: 所有非 cache 来源获取的价格均写入 DB（之前仅 realtime 源写入，导致 finance-query 获取的港股等价格不存储）
- **仓位占比基数**: 持仓管理的仓位百分比基于全部持仓总市值计算，不受市场筛选和搜索影响

---

## 2026-04-28 v1.9.3 - 关联现金记录 + 持仓盈亏币种切换 + 总仓位

### 新增
- **关联现金变更记录**: 券商买卖触发的投资账本现金变化会生成 DEPOSIT/WITHDRAW 交易记录（备注标注关联来源）
- **持仓管理币种切换**: 持仓管理页增加币种选择器，盈亏按选定币种换算显示
- **总仓位指标**: 总览页 PortfolioSummaryCard 显示"总仓位: xx%"（持仓市值/总资产）

---

## 2026-04-28 v1.9.2 - 持仓管理仓位占比 + 比例精度

### 新增
- **持仓管理仓位占比**: 新增"仓位"列，显示每只持仓占总市值的百分比

### 修改
- **持有比例精度**: 持仓管理中比例显示精确到两位小数 (如 83.33%)

---

## 2026-04-28 v1.9.1 - 行情共享 + 关联盈亏 + 关联现金

### 修复
- **行情跨账户共享**: 刷新行情时同一 symbol 只请求一次，价格更新写入所有账户的同 symbol 持仓
- **已实现盈亏币种修复**: 已清仓持仓 (quantity=0) 的币种从 holding 表获取，不再 fallback 到 CNY

### 新增
- **关联持仓已实现盈亏**: 投资账本计算已实现盈亏时，包含关联券商持仓的已实现盈亏 × 关联比例
- **关联持仓现金联动**: 券商账户买入/卖出时，关联投资账本按比例扣减/增加对应币种现金；回滚同理

---

## 2026-04-28 v1.9.0 - 券商账户 + 持仓关联

### 新增
- **券商账户类型**: 账户新增类型字段 (`portfolio`/`broker`)
  - 侧边栏创建账户时可选择"投资账本"或"券商账户"
  - 券商账户显示"券"标签，完整支持建仓/买入/卖出/编辑
- **持仓关联**: 投资账本的持仓可关联到券商账户的持仓
  - 建仓/编辑时勾选"关联券商持仓"，选择目标持仓和占比 (1-100%)
  - 关联后数量和成本自动从券商同步，显示值乘以占比 (复用 holding_ratio)
  - 一个券商持仓可被多个投资账本关联
  - 关联持仓只读，不可手动买入/卖出
  - 可取消关联，保留当前值恢复可编辑
- **同步机制**: 券商持仓变更 (买入/卖出/编辑/回滚) 自动同步到所有关联持仓
- **券商持仓列表 API**: `GET /holdings/broker-positions` 返回所有券商账户持仓
- **每页持仓数可配置**: 设置中新增每页持仓数选项 (5/10/15/20/30)
- **刷新倒计时修复**: 基于上次更新时间 + 5分钟计算，到 0 自动刷新并提示
- **已实现盈亏修复**: 缺少建仓记录时用持仓成本价作为兜底

### 修改
- **持仓管理**: 关联持仓行显示"关联"标签，隐藏买入/卖出按钮
- **删除券商持仓/账户**: 自动断开所有关联

### 新文件
- `frontend/src/hooks/useSettings.ts` — 全局设置 Context (每页持仓数等)

### 数据库
- `accounts` 表新增 `type` 列 (VARCHAR(20), 默认 'portfolio')
- `holdings` 表新增 `linked_broker_holding_id` 列 (INTEGER, nullable)

---

## 2026-04-27 v1.8.1 - 启动脚本

### 新增
- **`start.sh`**: 一键启动前后端，自动清理旧进程

---

## 2026-04-27 v1.8.0 - 交易回滚 + 刷新间隔调整

### 新增
- **交易回滚**: 交易记录页每条记录增加"回滚"按钮
  - BUY 回滚: 减少持仓数量，返还现金，重算加权平均成本
  - SELL 回滚: 恢复持仓数量，扣除现金
  - DEPOSIT 回滚: 扣减现金余额
  - WITHDRAW 回滚: 恢复现金余额
  - 回滚操作自动生成一条反向交易记录（备注标注"回滚"）
  - 已经是回滚记录的不显示回滚按钮
  - 后端 `POST /transactions/{id}/rollback` 新接口

### 修改
- **自动刷新间隔**: 首页行情自动刷新从 30 分钟改为 5 分钟

---

## 2026-04-27 v1.7.13 - 国际股票行情缓存策略

### 修改
- **DB 缓存优先**: 国际股票刷新时，若 DB 缓存在 1 分钟内则直接使用，跳过在线请求
- **仅实时源更新 DB**: 只有 Google Finance 和 yfinance（标记 `realtime: true`）成功时才写入 DB 缓存；finance-query 等延迟源不覆盖已有的实时价格

---

## 2026-04-27 v1.7.12 - 快讯提醒展开动画

### 修改
- **快讯提醒悬停过渡动画**: 使用 max-height + max-width 的 CSS transition 实现平滑展开/收起，替代瞬间切换内容

---

## 2026-04-27 v1.7.11 - 跳过零持仓行情刷新

### 修改
- **行情刷新跳过零持仓**: 批量和单个刷新均过滤 quantity>0，不再为已清仓的持仓获取行情

---

## 2026-04-27 v1.7.10 - 底部指数行情条修复

### 修复
- **指数行情条被遮挡**: z-index 从 30 提升到 50，确保始终显示在分页控件之上
- **侧边栏收起时行情条适配**: left 值跟随侧边栏宽度变化（w-56/w-16）

---

## 2026-04-27 v1.7.9 - 分页控件位置固定

### 修改
- **分页控件位置固定**: 持仓明细和持仓管理表格设置固定 minHeight，分页控件不再随当页行数变化而上下移动

---

## 2026-04-27 v1.7.8 - 持仓管理盈亏 + 首页分页调整

### 新增
- **持仓管理盈亏列**: 每只持仓显示浮动盈亏金额和百分比（红涨绿跌）

### 修改
- **首页持仓明细每页 5 条**: 从 10 条改为 5 条，页面更紧凑

---

## 2026-04-27 v1.7.7 - 持仓分页 + 市值排序

### 新增
- **持仓明细分页**: 总览页持仓明细表每页 10 条，超出显示分页控件
- **持仓管理分页**: 持仓管理页每页 10 条，筛选/搜索时自动回到第一页

### 修改
- **默认按市值排序**: 持仓明细和持仓管理均按市值从大到小排列

---

## 2026-04-27 v1.7.6 - 行情刷新失败详情

### 修改
- **行情刷新失败提示**: 有失败时 Toast 显示失败的具体 symbol 列表，如 "2 个失败 (SIVE.ST, SOI.PA)"

---

## 2026-04-27 v1.7.5 - 快讯提醒悬停展开

### 修改
- **快讯提醒悬停交互**: 鼠标悬停时显示完整内容、暂停自动消失计时；移开后恢复倒计时

---

## 2026-04-27 v1.7.4 - 新快讯全局提醒

### 新增
- **快讯全局提醒**: 有新快讯时页面顶部中间弹出提醒横幅
  - 显示快讯摘要（最多 80 字），8 秒后自动消失
  - 点击横幅跳转到资讯页面，可手动点 × 关闭
  - 在资讯页面时不弹出，首次加载不弹出（仅后续新增触发）

---

## 2026-04-27 v1.7.3 - 隐藏零持仓

### 修改
- **隐藏数量为 0 的持仓**: 总览持仓明细和持仓管理页不再显示数量为 0 的持仓（数据库保留，卖完后自动隐藏）

---

## 2026-04-27 v1.7.2 - 行情源优化 + 编辑代码 + Toast 绿色

### 新增
- **Google Finance 数据源**: 解析 Google Finance 页面获取实时价格，支持美股/港股/欧股
  - 美股自动尝试 NASDAQ/NYSE/NYSEARCA 交易所
  - 国际股票回退链调整为: Google Finance (实时) → yfinance (实时) → finance-query (延迟) → akshare-us
- **DB 缓存兜底**: 所有在线数据源失败时，保留数据库中已有的缓存价格，不再标记为失败
- **编辑持仓可修改代码**: 编辑弹窗中股票代码字段可修改

### 修改
- **Toast 成功图标改为绿色**: 操作成功提示图标从红色 (`text-gain`) 改为固定绿色 (`text-emerald-500`)

---

## 2026-04-27 v1.7.1 - 侧边栏收起

### 新增
- **侧边栏收起/展开**: 鼠标悬停侧边栏右边缘出现圆形切换按钮
  - 收起后仅显示图标 (w-56 → w-16)，悬停图标显示 title 提示
  - 主内容区 margin 平滑过渡 (`transition-all duration-300`)
  - 收起状态 localStorage 持久化

---

## 2026-04-27 v1.7.0 - 实时资讯 + 操作反馈 + 搜索

### 新增
- **实时资讯页**: 侧边栏新增"资讯"，展示金十数据市场快讯信息流
  - 数据源: `jin10.com/flash_newest.js`，后端代理 + 30 秒缓存
  - 频道筛选: 全部/快讯/A股/期货/数据
  - 重要快讯红点标记 + 背景高亮，经济数据特殊展示
  - 显示上次更新时间，手动刷新按钮
- **全局 Toast 通知系统**: `useToast` Context 替代各页面本地 toast
  - 持仓操作 (建仓/修改/删除/买入/卖出) 成功/失败提示
  - 现金操作 (入金/出金) 成功/失败提示
  - 支持 success/error 两种样式
- **持仓搜索**: 持仓管理页新增搜索框，按名称或代码实时筛选

### 新文件
- `backend/app/api/news.py` — 金十快讯代理 API
- `frontend/src/pages/NewsPage.tsx` — 资讯页面
- `frontend/src/api/news.ts`, `frontend/src/hooks/useNews.ts` — 快讯 API + hook
- `frontend/src/hooks/useToast.ts` — 全局 Toast Context

---

## 2026-04-27 v1.6.2 - 交易记录分页 + 日期筛选 + 时间修复

### 新增
- **交易记录分页**: 每页 20 条，底部分页控件（上/下页 + 页码 + 总条数）
- **日期区间筛选**: 交易记录页新增起止日期选择器，支持按日期范围查询
- **后端 `X-Total-Count` 响应头**: 交易记录 API 返回总条数用于分页

### 修复
- **买入/卖出时间为 UTC**: TradeDialog 使用 `new Date().toISOString()` 发送了 UTC 时间，改为不传 `transacted_at`，由后端统一使用 `now_beijing()` 生成北京时间
- **账户删除确认弹窗居中**: ConfirmDialog 从 Sidebar `<aside>` 内移到外层，弹窗居中于整个页面

---

## 2026-04-27 v1.6.1 - 德股 + 重复持仓 + 入金负数

### 新增
- **德股市场 (DE)**: 支持德国股票，币种 EUR，代码格式如 SAP.DE

### 修改
- **允许重复持仓**: 同一账户可添加多个相同 symbol 的持仓（不同名称），去掉唯一约束
- **入金支持负数**: 去掉入金金额最小值 0.01 的校验
- **holdings 表约束修复**: 重建 holdings 和 cash_balances 表以正确更新唯一约束（修复多账户创建同 symbol 持仓失败的问题）

---

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
