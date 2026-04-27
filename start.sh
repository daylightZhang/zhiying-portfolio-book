#!/bin/bash
# 知盈 (ZhiYing) - 一键启动前后端

cd "$(dirname "$0")"

# Kill existing processes
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

# Start backend
echo "Starting backend..."
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
cd ..

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
cd ..

sleep 3
echo ""
echo "✓ Backend:  http://localhost:8000"
echo "✓ Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

wait
