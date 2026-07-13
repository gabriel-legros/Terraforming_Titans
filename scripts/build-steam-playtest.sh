#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM="${1:-${STEAM_PLAYTEST_PLATFORMS:-win}}"

case "$PLATFORM" in
  win|linux|all) ;;
  *)
    echo "Unsupported Steam Playtest platform: $PLATFORM" >&2
    echo "Expected: win, linux, or all" >&2
    exit 1
    ;;
esac

if [ "${SKIP_VERSION_BUMP:-0}" != "1" ]; then
  node "$SCRIPT_DIR/update-game-version.js" playtest
fi

case "$PLATFORM" in
  win)
    bash "$SCRIPT_DIR/build-steam-target.sh" "Steam Playtest" 4876760 "steam-playtest-win-unpacked" win
    ;;
  linux)
    bash "$SCRIPT_DIR/build-steam-target.sh" "Steam Playtest Linux" 4876760 "steam-playtest-linux-unpacked" linux
    ;;
  all)
    bash "$SCRIPT_DIR/build-steam-target.sh" "Steam Playtest" 4876760 "steam-playtest-win-unpacked" win
    bash "$SCRIPT_DIR/build-steam-target.sh" "Steam Playtest Linux" 4876760 "steam-playtest-linux-unpacked" linux
    ;;
esac
