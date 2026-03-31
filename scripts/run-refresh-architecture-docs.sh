#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

find_node_bin() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  if [ -x /opt/homebrew/bin/node ]; then
    echo /opt/homebrew/bin/node
    return 0
  fi

  if [ -x /usr/local/bin/node ]; then
    echo /usr/local/bin/node
    return 0
  fi

  local nvm_default="${HOME}/.nvm/alias/default"
  if [ -f "$nvm_default" ]; then
    local alias_name
    alias_name="$(tr -d '[:space:]' < "$nvm_default")"
    local alias_node="${HOME}/.nvm/versions/node/${alias_name}/bin/node"
    if [ -x "$alias_node" ]; then
      echo "$alias_node"
      return 0
    fi
  fi

  local v20_node
  v20_node="$(ls -1d "${HOME}"/.nvm/versions/node/v20*/bin/node 2>/dev/null | sort -V | tail -n1 || true)"
  if [ -n "$v20_node" ] && [ -x "$v20_node" ]; then
    echo "$v20_node"
    return 0
  fi

  local latest_node
  latest_node="$(ls -1d "${HOME}"/.nvm/versions/node/v*/bin/node 2>/dev/null | sort -V | tail -n1 || true)"
  if [ -n "$latest_node" ] && [ -x "$latest_node" ]; then
    echo "$latest_node"
    return 0
  fi

  return 1
}

NODE_BIN="$(find_node_bin || true)"
if [ -z "$NODE_BIN" ]; then
  echo "No Node.js binary found. Install Node 20.x or ensure node is on PATH." >&2
  exit 1
fi

cd "$ROOT_DIR"
exec "$NODE_BIN" --import tsx scripts/refresh-architecture-docs.ts "$@"
