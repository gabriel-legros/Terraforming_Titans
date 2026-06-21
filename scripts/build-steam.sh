#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist/win-unpacked"

cd "$ROOT_DIR"
rm -rf "$OUT_DIR"
npx electron-builder --win --dir

echo "Steam build written to $OUT_DIR"
