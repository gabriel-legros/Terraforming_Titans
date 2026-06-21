#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/build-steam-target.sh" "Steam Playtest" 4876760 "steam-playtest-win-unpacked"
