#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$PROJECT_DIR/.run"
BACKEND_PORT=39888
FRONTEND_PORT=39889
LAUNCH_DOMAIN="gui/$(id -u)"

mkdir -p "$RUN_DIR"

is_listening() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_url() {
  local name="$1"
  local url="$2"

  for _ in {1..40}; do
    if curl --silent --fail --max-time 1 "$url" >/dev/null 2>&1; then
      echo "[OK] $name 已启动：$url"
      return 0
    fi
    sleep 0.25
  done

  echo "[ERROR] $name 启动失败，请查看 $RUN_DIR/${name}.log" >&2
  return 1
}

find_node() {
  local system_node
  local bundled_node="${HOME:-}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"

  if [[ -n "${NODE_BIN:-}" ]] && "$NODE_BIN" --version >/dev/null 2>&1; then
    printf '%s\n' "$NODE_BIN"
    return 0
  fi

  system_node="$(command -v node 2>/dev/null || true)"
  if [[ -n "$system_node" ]] && "$system_node" --version >/dev/null 2>&1; then
    printf '%s\n' "$system_node"
    return 0
  fi

  if [[ -x "$bundled_node" ]] && "$bundled_node" --version >/dev/null 2>&1; then
    printf '%s\n' "$bundled_node"
    return 0
  fi

  return 1
}

launch_service() {
  local label="$1"
  local plist="$2"

  if launchctl print "$LAUNCH_DOMAIN/$label" >/dev/null 2>&1; then
    launchctl kickstart -k "$LAUNCH_DOMAIN/$label"
  else
    launchctl bootstrap "$LAUNCH_DOMAIN" "$plist"
  fi
}

start_backend() {
  if is_listening "$BACKEND_PORT"; then
    echo "[SKIP] 后端端口 $BACKEND_PORT 已在监听"
    return 0
  fi

  echo "[START] 编译并启动后端..."
  (cd "$PROJECT_DIR/server" && go build -o "$RUN_DIR/backend" ./cmd/server/main.go)

  printf '%s\n' \
    '<?xml version="1.0" encoding="UTF-8"?>' \
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' \
    '<plist version="1.0">' \
    '<dict>' \
    '  <key>Label</key><string>com.personal-utils.backend</string>' \
    "  <key>ProgramArguments</key><array><string>$RUN_DIR/backend</string></array>" \
    "  <key>WorkingDirectory</key><string>$PROJECT_DIR/server</string>" \
    '  <key>RunAtLoad</key><true/>' \
    '  <key>KeepAlive</key><true/>' \
    "  <key>StandardOutPath</key><string>$RUN_DIR/backend.log</string>" \
    "  <key>StandardErrorPath</key><string>$RUN_DIR/backend.log</string>" \
    '</dict>' \
    '</plist>' >"$RUN_DIR/backend.plist"

  launch_service "com.personal-utils.backend" "$RUN_DIR/backend.plist"

  wait_for_url backend "http://127.0.0.1:$BACKEND_PORT/api/health"
}

start_frontend() {
  local node_bin
  local vite_entry="$PROJECT_DIR/web/node_modules/vite/bin/vite.js"

  if is_listening "$FRONTEND_PORT"; then
    echo "[SKIP] 前端端口 $FRONTEND_PORT 已在监听"
    return 0
  fi

  if [[ ! -f "$vite_entry" ]]; then
    echo "[ERROR] 前端依赖尚未安装，请先在 web 目录执行 npm install" >&2
    return 1
  fi

  if ! node_bin="$(find_node)"; then
    echo "[ERROR] 没有找到可用的 Node.js；也可以通过 NODE_BIN 指定路径" >&2
    return 1
  fi

  echo "[START] 使用 $node_bin 启动前端..."
  printf '%s\n' \
    '<?xml version="1.0" encoding="UTF-8"?>' \
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' \
    '<plist version="1.0">' \
    '<dict>' \
    '  <key>Label</key><string>com.personal-utils.frontend</string>' \
    "  <key>ProgramArguments</key><array><string>$node_bin</string><string>$vite_entry</string><string>--host</string><string>127.0.0.1</string></array>" \
    "  <key>WorkingDirectory</key><string>$PROJECT_DIR/web</string>" \
    '  <key>RunAtLoad</key><true/>' \
    '  <key>KeepAlive</key><true/>' \
    "  <key>StandardOutPath</key><string>$RUN_DIR/frontend.log</string>" \
    "  <key>StandardErrorPath</key><string>$RUN_DIR/frontend.log</string>" \
    '</dict>' \
    '</plist>' >"$RUN_DIR/frontend.plist"

  launch_service "com.personal-utils.frontend" "$RUN_DIR/frontend.plist"

  wait_for_url frontend "http://127.0.0.1:$FRONTEND_PORT/"
}

start_backend
start_frontend

echo
echo "前端：http://localhost:$FRONTEND_PORT/"
echo "后端：http://localhost:$BACKEND_PORT/api/health"
echo "日志：$RUN_DIR/backend.log 和 $RUN_DIR/frontend.log"
