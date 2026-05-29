#!/usr/bin/env bash
# 知盈 (ZhiYing) - 停止前后端

cd "$(dirname "$0")"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

stop_pid_file() {
  local f=$1
  local name=$2
  if [ -f "$f" ]; then
    local pid
    pid=$(cat "$f")
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      sleep 0.5
      kill -9 "$pid" 2>/dev/null || true
      echo -e "${GREEN}✓${NC} ${name} 已停止 (pid $pid)"
    fi
    rm -f "$f"
  fi
}

stop_pid_file .logs/backend.pid 后端
stop_pid_file .logs/frontend.pid 前端

# Fallback: 兜底端口清理
PORT_PIDS=$(lsof -ti:8000 -ti:5173 2>/dev/null || true)
if [ -n "$PORT_PIDS" ]; then
  echo -e "${YELLOW}!${NC} 兜底清理占用 8000 / 5173 的进程: $PORT_PIDS"
  echo "$PORT_PIDS" | xargs -r kill -9 2>/dev/null || true
fi

echo -e "${GREEN}全部服务已停止${NC}"
