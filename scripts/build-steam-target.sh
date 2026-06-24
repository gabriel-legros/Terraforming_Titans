#!/usr/bin/env bash
set -euo pipefail

TARGET_NAME="${1:?target name required}"
STEAM_APP_ID="${2:?Steam AppID required}"
OUT_DIR_NAME="${3:?output directory name required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist/$OUT_DIR_NAME"
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
cat > "$BUILD_TARGET_FILE" <<BUILD_TARGET
const GAME_BUILD_TARGET = 'steam';
const STEAM_APP_ID = $STEAM_APP_ID;
const GAME_FEATURES = {
    patienceDailyClaimButton: GAME_BUILD_TARGET === 'steam',
    patienceDailyRewardFromExport: GAME_BUILD_TARGET === 'browser',
    whiteNoiseKeepAlive: GAME_BUILD_TARGET === 'browser',
    exitSaveSlot: GAME_BUILD_TARGET !== 'browser',
    electronWindowControls: GAME_BUILD_TARGET !== 'browser'
};
BUILD_TARGET
npx electron-builder --win --dir --config.directories.output=dist
if [ -d "$ROOT_DIR/dist/win-unpacked" ]; then
  mv "$ROOT_DIR/dist/win-unpacked" "$OUT_DIR"
fi
cp "$ROOT_DIR/node_modules/steamworks.js/dist/win64/steam_api64.dll" "$OUT_DIR/steam_api64.dll"
BUILD_TARGET_PATH="$OUT_DIR/resources/app/src/js/build-target.js" EXPECTED_STEAM_APP_ID="$STEAM_APP_ID" TARGET_NAME="$TARGET_NAME" node <<'NODE'
const fs = require('fs');
const data = fs.readFileSync(process.env.BUILD_TARGET_PATH, 'utf8');
if (!data.includes("GAME_BUILD_TARGET = 'steam'")) {
  throw new Error(`${process.env.TARGET_NAME} build did not package the steam build target`);
}
if (!data.includes(`STEAM_APP_ID = ${process.env.EXPECTED_STEAM_APP_ID}`)) {
  throw new Error(`${process.env.TARGET_NAME} build did not package AppID ${process.env.EXPECTED_STEAM_APP_ID}`);
}
NODE

echo "$TARGET_NAME build written to $OUT_DIR"
