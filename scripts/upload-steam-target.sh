#!/usr/bin/env bash
set -euo pipefail

TARGET_NAME="${1:?target name required}"
STEAM_APP_ID="${2:?Steam AppID required}"
STEAM_DEPOT_ID="${3:?Steam depot ID required}"
OUT_DIR_NAME="${4:?output directory name required}"
WORKSPACE_NAME="${5:?SteamPipe workspace name required}"
BUILD_SCRIPT="${6:?build script required}"
shift 6

DEPOT_IDS=("$STEAM_DEPOT_ID")
OUT_DIR_NAMES=("$OUT_DIR_NAME")
DEPOT_PLATFORMS=("win")

for depot_spec in "$@"; do
  IFS=':' read -r depot_id depot_out_dir depot_platform <<< "$depot_spec"
  if [ -z "$depot_id" ] || [ -z "$depot_out_dir" ] || [ -z "$depot_platform" ]; then
    echo "Invalid depot spec: $depot_spec" >&2
    echo "Expected format: depot_id:output_directory:platform" >&2
    exit 1
  fi
  DEPOT_IDS+=("$depot_id")
  OUT_DIR_NAMES+=("$depot_out_dir")
  DEPOT_PLATFORMS+=("$depot_platform")
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

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

if [ "${SKIP_STEAM_BUILD:-0}" != "1" ]; then
  bash "$SCRIPT_DIR/$BUILD_SCRIPT"
fi

for out_dir_name in "${OUT_DIR_NAMES[@]}"; do
  build_out_dir="$ROOT_DIR/dist/$out_dir_name"
  if [ ! -d "$build_out_dir" ]; then
    echo "$TARGET_NAME build output not found: $build_out_dir" >&2
    exit 1
  fi
done

if [ ! -x "$STEAMCMD_PATH" ]; then
  echo "SteamCMD not found or not executable: $STEAMCMD_PATH" >&2
  echo "Set STEAM_PIPE_ROOT or STEAMCMD_PATH if your SteamPipe builder is elsewhere." >&2
  exit 1
fi

mkdir -p "$CONTENT_DIR" "$SCRIPTS_DIR" "$OUTPUT_DIR"
rm -rf "$CONTENT_DIR"
mkdir -p "$CONTENT_DIR"
for i in "${!DEPOT_IDS[@]}"; do
  depot_id="${DEPOT_IDS[$i]}"
  build_out_dir="$ROOT_DIR/dist/${OUT_DIR_NAMES[$i]}"
  depot_content_dir="$CONTENT_DIR/$depot_id"
  mkdir -p "$depot_content_dir"
  cp -a "$build_out_dir"/. "$depot_content_dir"/
done

{
cat <<VDF
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
VDF
for depot_id in "${DEPOT_IDS[@]}"; do
  printf '    "%s" "depot_build_%s.vdf"\n' "$depot_id" "$depot_id"
done
cat <<VDF
  }
}
VDF
} > "$APP_BUILD_VDF"

for depot_id in "${DEPOT_IDS[@]}"; do
cat > "$SCRIPTS_DIR/depot_build_$depot_id.vdf" <<VDF
"DepotBuildConfig"
{
  "DepotID" "$depot_id"
  "ContentRoot" "..\\content\\$depot_id\\"
  "FileMapping"
  {
    "LocalPath" "*"
    "DepotPath" "."
    "recursive" "1"
  }
}
VDF
done

validate_staged_content() {
  local staged_dir="$1"
  local platform="$2"

  BUILD_TARGET_PATH="$staged_dir/resources/app/src/js/build-target.js" \
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
    "$staged_dir/resources/app/index.html" \
    "$staged_dir/LICENSE.electron.txt" \
    "$staged_dir/LICENSES.chromium.html"
  do
    if [ ! -e "$required_path" ]; then
      echo "Required staged file missing: $required_path" >&2
      exit 1
    fi
  done

  case "$platform" in
    win)
      if [ ! -e "$staged_dir/Terraforming Titans.exe" ]; then
        echo "Required staged file missing: $staged_dir/Terraforming Titans.exe" >&2
        exit 1
      fi
      ;;
    linux)
      if [ ! -e "$staged_dir/terraforming-titans" ]; then
        echo "Required staged file missing: $staged_dir/terraforming-titans" >&2
        exit 1
      fi
      if [ ! -e "$staged_dir/libsteam_api.so" ]; then
        echo "Required staged file missing: $staged_dir/libsteam_api.so" >&2
        exit 1
      fi
      ;;
    *)
      echo "Unsupported staged platform: $platform" >&2
      exit 1
      ;;
  esac
}

for i in "${!DEPOT_IDS[@]}"; do
  depot_id="${DEPOT_IDS[$i]}"
  validate_staged_content "$CONTENT_DIR/$depot_id" "${DEPOT_PLATFORMS[$i]}"
done

for depot_id in "${DEPOT_IDS[@]}"; do
  echo "$TARGET_NAME depot $depot_id content staged in $CONTENT_DIR/$depot_id"
done
echo "$TARGET_NAME app VDF written to $APP_BUILD_VDF"
for depot_id in "${DEPOT_IDS[@]}"; do
  echo "$TARGET_NAME depot VDF written to $SCRIPTS_DIR/depot_build_$depot_id.vdf"
done
echo "SteamCMD will prompt for password and Steam Guard if needed."

cd "$(dirname "$STEAMCMD_PATH")"
"$STEAMCMD_PATH" +login "$STEAM_USERNAME" +run_app_build "..\\scripts\\app_build_$STEAM_APP_ID.vdf" +quit
