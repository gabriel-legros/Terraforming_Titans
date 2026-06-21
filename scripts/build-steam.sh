#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist/win-unpacked"
BUILD_TARGET_FILE="$ROOT_DIR/src/js/build-target.js"
ORIGINAL_BUILD_TARGET="$(mktemp)"
cp "$BUILD_TARGET_FILE" "$ORIGINAL_BUILD_TARGET"
restore_build_target() {
  cp "$ORIGINAL_BUILD_TARGET" "$BUILD_TARGET_FILE"
  rm -f "$ORIGINAL_BUILD_TARGET"
}
trap restore_build_target EXIT

cd "$ROOT_DIR"
rm -rf "$OUT_DIR"
cat > "$BUILD_TARGET_FILE" <<'BUILD_TARGET'
const GAME_BUILD_TARGET = 'steam';
const GAME_FEATURES = {
    patienceDailyClaimButton: GAME_BUILD_TARGET === 'steam',
    patienceDailyRewardFromExport: GAME_BUILD_TARGET === 'browser',
    whiteNoiseKeepAlive: GAME_BUILD_TARGET === 'browser'
};
BUILD_TARGET
npx electron-builder --win --dir
BUILD_TARGET_PATH="$OUT_DIR/resources/app/src/js/build-target.js" node <<'NODE'
const fs = require('fs');
const data = fs.readFileSync(process.env.BUILD_TARGET_PATH, 'utf8');
if (!data.includes("GAME_BUILD_TARGET = 'steam'")) {
  throw new Error('Steam build did not package the steam build target');
}
NODE

echo "Steam build written to $OUT_DIR"
