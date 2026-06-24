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
cat > "$OUT_DIR/src/js/build-target.js" <<'BUILD_TARGET'
const GAME_BUILD_TARGET = 'browser';
const STEAM_APP_ID = null;
const GAME_FEATURES = {
    patienceDailyClaimButton: GAME_BUILD_TARGET === 'steam',
    patienceDailyRewardFromExport: GAME_BUILD_TARGET === 'browser',
    whiteNoiseKeepAlive: GAME_BUILD_TARGET === 'browser',
    exitSaveSlot: GAME_BUILD_TARGET !== 'browser'
};
BUILD_TARGET
grep -q "GAME_BUILD_TARGET = 'browser'" "$OUT_DIR/src/js/build-target.js"

echo "Browser build written to $OUT_DIR"
