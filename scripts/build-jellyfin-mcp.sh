#!/usr/bin/env bash
set -euo pipefail

JELLYFIN_MCP_REPO="https://github.com/jaredtrent/jellyfin-mcp.git"
JELLYFIN_MCP_DIR="/tmp/jellyfin-mcp-build"
OUT_DIR="${1:-$(dirname "$0")/../bin}"

mkdir -p "$OUT_DIR"

if [ -d "$JELLYFIN_MCP_DIR" ]; then
  cd "$JELLYFIN_MCP_DIR" && git pull --ff-only
else
  git clone --depth 1 "$JELLYFIN_MCP_REPO" "$JELLYFIN_MCP_DIR"
  cd "$JELLYFIN_MCP_DIR"
fi

echo "Building jellyfin-mcp..."
go build -o "$OUT_DIR/jellyfin-mcp" .
echo "Built: $OUT_DIR/jellyfin-mcp"
