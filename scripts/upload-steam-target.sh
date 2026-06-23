#!/usr/bin/env bash
set -euo pipefail

TARGET_NAME="${1:?target name required}"
STEAM_APP_ID="${2:?Steam AppID required}"
STEAM_DEPOT_ID="${3:?Steam depot ID required}"
OUT_DIR_NAME="${4:?output directory name required}"
WORKSPACE_NAME="${5:?SteamPipe workspace name required}"
BUILD_SCRIPT="${6:?build script required}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_OUT_DIR="$ROOT_DIR/dist/$OUT_DIR_NAME"

path_to_bash() {
  local path="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -u "$path"
    return
  fi
  if [[ "$path" =~ ^([A-Za-z]):\\(.*)$ ]]; then
    local drive="${BASH_REMATCH[1],,}"
    local rest="${BASH_REMATCH[2]//\\//}"
    if [ -d "/$drive" ]; then
      printf '/%s/%s\n' "$drive" "$rest"
    else
      printf '/mnt/%s/%s\n' "$drive" "$rest"
    fi
    return
  fi
  printf '%s\n' "$path"
}

DEFAULT_STEAM_PIPE_ROOT="C:\\SteamPipe\\$WORKSPACE_NAME"
STEAM_PIPE_ROOT="$(path_to_bash "${STEAM_PIPE_ROOT:-$DEFAULT_STEAM_PIPE_ROOT}")"
STEAMCMD_PATH="$(path_to_bash "${STEAMCMD_PATH:-$STEAM_PIPE_ROOT/builder/steamcmd.exe}")"
STEAM_USERNAME="${STEAM_USERNAME:-Thratur}"
STEAM_SET_LIVE="${STEAM_SET_LIVE:-}"
STEAM_PREVIEW="${STEAM_PREVIEW:-0}"

CONTENT_DIR="$STEAM_PIPE_ROOT/content"
SCRIPTS_DIR="$STEAM_PIPE_ROOT/scripts"
OUTPUT_DIR="$STEAM_PIPE_ROOT/output"
APP_BUILD_VDF="$SCRIPTS_DIR/app_build_$STEAM_APP_ID.vdf"
DEPOT_BUILD_VDF="$SCRIPTS_DIR/depot_build_$STEAM_DEPOT_ID.vdf"

if [ "${SKIP_STEAM_BUILD:-0}" != "1" ]; then
  bash "$SCRIPT_DIR/$BUILD_SCRIPT"
fi

if [ ! -d "$BUILD_OUT_DIR" ]; then
  echo "$TARGET_NAME build output not found: $BUILD_OUT_DIR" >&2
  exit 1
fi

if [ ! -x "$STEAMCMD_PATH" ]; then
  echo "SteamCMD not found or not executable: $STEAMCMD_PATH" >&2
  echo "Set STEAM_PIPE_ROOT or STEAMCMD_PATH if your SteamPipe builder is elsewhere." >&2
  exit 1
fi

mkdir -p "$CONTENT_DIR" "$SCRIPTS_DIR" "$OUTPUT_DIR"
rm -rf "$CONTENT_DIR"
mkdir -p "$CONTENT_DIR"
cp -a "$BUILD_OUT_DIR"/. "$CONTENT_DIR"/

cat > "$APP_BUILD_VDF" <<VDF
"AppBuild"
{
  "AppID" "$STEAM_APP_ID"
  "Desc" "$TARGET_NAME"
  "Preview" "$STEAM_PREVIEW"
  "Local" ""
  "SetLive" "$STEAM_SET_LIVE"
  "ContentRoot" "..\\content\\"
  "BuildOutput" "..\\output\\"
  "Depots"
  {
    "$STEAM_DEPOT_ID" "depot_build_$STEAM_DEPOT_ID.vdf"
  }
}
VDF

cat > "$DEPOT_BUILD_VDF" <<VDF
"DepotBuildConfig"
{
  "DepotID" "$STEAM_DEPOT_ID"
  "ContentRoot" "..\\content\\"
  "FileMapping"
  {
    "LocalPath" "*"
    "DepotPath" "."
    "recursive" "1"
  }
}
VDF

BUILD_TARGET_PATH="$CONTENT_DIR/resources/app/src/js/build-target.js" \
EXPECTED_STEAM_APP_ID="$STEAM_APP_ID" \
TARGET_NAME="$TARGET_NAME" \
node <<'NODE'
const fs = require('fs');
const buildTargetPath = process.env.BUILD_TARGET_PATH;
const data = fs.readFileSync(buildTargetPath, 'utf8');
if (!data.includes("GAME_BUILD_TARGET = 'steam'")) {
  throw new Error(`${process.env.TARGET_NAME} staged content is not a Steam build`);
}
if (!data.includes(`STEAM_APP_ID = ${process.env.EXPECTED_STEAM_APP_ID}`)) {
  throw new Error(`${process.env.TARGET_NAME} staged content does not use AppID ${process.env.EXPECTED_STEAM_APP_ID}`);
}
NODE

for required_path in \
  "$CONTENT_DIR/Terraforming Titans.exe" \
  "$CONTENT_DIR/resources/app/index.html" \
  "$CONTENT_DIR/LICENSE.electron.txt" \
  "$CONTENT_DIR/LICENSES.chromium.html"
do
  if [ ! -e "$required_path" ]; then
    echo "Required staged file missing: $required_path" >&2
    exit 1
  fi
done

echo "$TARGET_NAME content staged in $CONTENT_DIR"
echo "$TARGET_NAME VDF written to $APP_BUILD_VDF"
echo "SteamCMD will prompt for password and Steam Guard if needed."

cd "$(dirname "$STEAMCMD_PATH")"
"$STEAMCMD_PATH" +login "$STEAM_USERNAME" +run_app_build "..\\scripts\\app_build_$STEAM_APP_ID.vdf" +quit
