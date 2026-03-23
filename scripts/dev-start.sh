#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.dev"
BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"
BACKEND_LOG_FILE="$RUNTIME_DIR/backend.log"
FRONTEND_LOG_FILE="$RUNTIME_DIR/frontend.log"
BACKEND_PORT=8000
FRONTEND_PORT=3000

mkdir -p "$RUNTIME_DIR"

kill_port_listener() {
  local port="$1"
  local pids

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [[ -z "$pids" ]]; then
    return
  fi

  echo "Port $port is busy. Stopping existing listener(s): $pids"
  kill $pids 2>/dev/null || true
  sleep 1

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [[ -n "$pids" ]]; then
    kill -9 $pids 2>/dev/null || true
  fi
}

start_if_needed() {
  local name="$1"
  local pid_file="$2"
  local cmd="$3"

  if [[ -f "$pid_file" ]]; then
    local existing_pid
    existing_pid="$(cat "$pid_file")"
    if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "$name already running (pid $existing_pid)"
      return
    fi
    rm -f "$pid_file"
  fi

  echo "Starting $name..."
  eval "$cmd"
}

kill_port_listener "$BACKEND_PORT"
kill_port_listener "$FRONTEND_PORT"

start_if_needed "backend" "$BACKEND_PID_FILE" "(cd '$ROOT_DIR/backend' && nohup env BACKEND_HOST=127.0.0.1 BACKEND_PORT=$BACKEND_PORT BACKEND_RELOAD=0 python3 run_backend.py > '$BACKEND_LOG_FILE' 2>&1 & echo \$! > '$BACKEND_PID_FILE')"
start_if_needed "frontend" "$FRONTEND_PID_FILE" "(cd '$ROOT_DIR/frontend' && nohup npm run dev -- --port $FRONTEND_PORT > '$FRONTEND_LOG_FILE' 2>&1 & echo \$! > '$FRONTEND_PID_FILE')"

wait_for_http() {
  local name="$1"
  local url="$2"
  local attempts=40

  for ((i=1; i<=attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$name is healthy at $url"
      return 0
    fi
    sleep 0.5
  done

  echo "$name did not become healthy: $url"
  return 1
}

wait_for_http "backend" "http://127.0.0.1:$BACKEND_PORT/health"
wait_for_http "frontend" "http://127.0.0.1:$FRONTEND_PORT"

echo ""
echo "Done."
echo "- frontend: http://127.0.0.1:$FRONTEND_PORT"
echo "- backend:  http://127.0.0.1:$BACKEND_PORT"
echo "- logs:     $RUNTIME_DIR"
