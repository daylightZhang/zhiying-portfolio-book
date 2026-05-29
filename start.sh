#!/usr/bin/env bash
# 知盈 (ZhiYing) - 一键启动前后端
# 首次部署请先执行 ./setup.sh

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

# ---------- prerequisite check ----------
if [ ! -d "backend/.venv" ]; then
  warn "未检测到 backend/.venv，请先运行: ./setup.sh"
  exit 1
fi
if [ ! -d "frontend/node_modules" ]; then
  warn "未检测到 frontend/node_modules，请先运行: ./setup.sh"
  exit 1
fi

# ---------- kill stale processes ----------
info "清理旧进程..."
lsof -ti:8000 2>/dev/null | xargs -r kill -9 2>/dev/null || true
lsof -ti:5173 2>/dev/null | xargs -r kill -9 2>/dev/null || true

# ---------- log dir ----------
mkdir -p .logs

# ---------- backend ----------
info "启动后端..."
(
  cd backend
  # shellcheck disable=SC1091
  source .venv/bin/activate
  exec uvicorn app.main:app --reload --port 8000
) > .logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > .logs/backend.pid

# ---------- frontend ----------
info "启动前端..."
(
  cd frontend
  exec npm run dev
) > .logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > .logs/frontend.pid

# ---------- wait for ready ----------
info "等待服务就绪..."
for i in {1..30}; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs 2>/dev/null | grep -q "200"; then
    break
  fi
  sleep 1
done

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
ok "后端 API:  http://localhost:8000     (pid $BACKEND_PID)"
ok "API 文档:  http://localhost:8000/docs"
ok "前端入口:  http://localhost:5173     (pid $FRONTEND_PID)"
echo ""
echo "日志位于 .logs/{backend,frontend}.log"
echo "停止服务：./stop.sh   或   Ctrl+C"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

# ---------- foreground / trap ----------
trap 'echo ""; info "正在停止..."; ./stop.sh; exit 0' INT TERM

# Tail logs so the user sees output until Ctrl+C
tail -f .logs/backend.log .logs/frontend.log
