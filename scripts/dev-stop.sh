#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.dev"
BACKEND_PORT=8000
FRONTEND_PORT=3000

kill_port_listener() {
  local port="$1"
  local pids

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [[ -z "$pids" ]]; then
    return
  fi

  echo "Stopping listeners on port $port: $pids"
  kill $pids 2>/dev/null || true
  sleep 1

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [[ -n "$pids" ]]; then
    kill -9 $pids 2>/dev/null || true
  fi
}

stop_from_pid_file() {
  local name="$1"
  local pid_file="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "$name is not tracked"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "Stopping $name (pid $pid)..."
    kill "$pid" || true
  else
    echo "$name pid file exists, but process is not running"
  fi

  rm -f "$pid_file"
}

stop_from_pid_file "backend" "$RUNTIME_DIR/backend.pid"
stop_from_pid_file "frontend" "$RUNTIME_DIR/frontend.pid"

kill_port_listener "$BACKEND_PORT"
kill_port_listener "$FRONTEND_PORT"

echo "Stop complete."
