#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist/browser"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/src"

cp "$ROOT_DIR/index.html" "$OUT_DIR/"
cp -R "$ROOT_DIR/vendor" "$OUT_DIR/vendor"
cp -R "$ROOT_DIR/LICENSES" "$OUT_DIR/LICENSES"
cp -R "$ROOT_DIR/assets" "$OUT_DIR/assets"
cp -R "$ROOT_DIR/src/js" "$OUT_DIR/src/js"
cp -R "$ROOT_DIR/src/css" "$OUT_DIR/src/css"

echo "Browser build written to $OUT_DIR"
