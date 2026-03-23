#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.dev"
BACKEND_PORT=8000
FRONTEND_PORT=3000

show_pid_status() {
  local name="$1"
  local pid_file="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "$name: not tracked"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "$name: running (pid $pid)"
  else
    echo "$name: stopped (stale pid file)"
  fi
}

show_http_status() {
  local name="$1"
  local url="$2"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
  echo "$name: $code ($url)"
}

show_listener() {
  local name="$1"
  local port="$2"
  local line

  line="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN | awk 'NR==2{print $1" pid=" $2}' || true)"
  if [[ -z "$line" ]]; then
    echo "$name listener: none (port $port)"
  else
    echo "$name listener: $line (port $port)"
  fi
}

show_pid_status "backend" "$RUNTIME_DIR/backend.pid"
show_pid_status "frontend" "$RUNTIME_DIR/frontend.pid"
show_listener "backend" "$BACKEND_PORT"
show_listener "frontend" "$FRONTEND_PORT"
show_http_status "backend health" "http://127.0.0.1:$BACKEND_PORT/health"
show_http_status "frontend root" "http://127.0.0.1:$FRONTEND_PORT"
