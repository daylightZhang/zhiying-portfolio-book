#!/usr/bin/env bash
# 知盈 (ZhiYing) - 一键环境部署脚本
# 完成 Python venv、依赖安装、playwright 浏览器、前端依赖、数据目录准备
# 完成后用 ./start.sh 启动服务

set -e

cd "$(dirname "$0")"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}▸${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}!${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令: $1，请先安装"
}

# ---------- prerequisite checks ----------
info "检查依赖工具..."

require_cmd python3
require_cmd npm

PY_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
PY_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')
if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 10 ]; }; then
  fail "需要 Python 3.10+，当前版本: $(python3 --version)"
fi
ok "Python: $(python3 --version)"
ok "Node:   $(node --version)"
ok "npm:    $(npm --version)"

# ---------- backend venv + deps ----------
info "准备后端 venv..."
cd backend
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  ok ".venv 已创建"
else
  ok ".venv 已存在，跳过创建"
fi

# shellcheck disable=SC1091
source .venv/bin/activate

info "安装/升级 pip..."
python -m pip install --upgrade pip --quiet

info "安装后端依赖 (可能需要几分钟)..."
pip install -r requirements.txt --quiet
ok "Python 依赖安装完成"

# Playwright 浏览器
if python -c "import playwright" 2>/dev/null; then
  info "下载 playwright chromium 浏览器..."
  if python -m playwright install chromium >/dev/null 2>&1; then
    ok "playwright chromium 已就绪"
  else
    warn "playwright 浏览器安装失败，IPO 抓取功能可能受影响（不影响主要功能）"
  fi
fi

deactivate
cd ..

# ---------- frontend deps ----------
info "安装前端依赖..."
cd frontend
if [ -f "package-lock.json" ]; then
  npm ci --silent || npm install --silent
else
  npm install --silent
fi
ok "前端依赖安装完成"
cd ..

# ---------- data dir (DB 表会在首次启动时自动创建) ----------
mkdir -p data
ok "data/ 目录就绪 (SQLite 库会在首次启动时自动建表)"

# ---------- final ----------
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
ok "环境部署完成"
echo ""
echo "下一步："
echo "  ./start.sh   # 启动前后端"
echo "  ./stop.sh    # 停止前后端"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
