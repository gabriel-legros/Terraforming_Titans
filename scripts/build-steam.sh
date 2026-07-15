#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM="${1:-${STEAM_PLATFORMS:-win}}"

case "$PLATFORM" in
  win|linux|all) ;;
  *)
    echo "Unsupported Steam platform: $PLATFORM" >&2
    echo "Expected: win, linux, or all" >&2
    exit 1
    ;;
esac

if [ "${SKIP_VERSION_BUMP:-0}" != "1" ]; then
  node "$SCRIPT_DIR/update-game-version.js" production
fi

case "$PLATFORM" in
  win)
    bash "$SCRIPT_DIR/build-steam-target.sh" "Steam" 4864000 "steam-win-unpacked" win
    ;;
  linux)
    bash "$SCRIPT_DIR/build-steam-target.sh" "Steam Linux" 4864000 "steam-linux-unpacked" linux
    ;;
  all)
    bash "$SCRIPT_DIR/build-steam-target.sh" "Steam" 4864000 "steam-win-unpacked" win
    bash "$SCRIPT_DIR/build-steam-target.sh" "Steam Linux" 4864000 "steam-linux-unpacked" linux
    ;;
esac
