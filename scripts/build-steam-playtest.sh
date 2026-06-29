#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/build-steam-target.sh" "Steam Playtest" 4876760 "steam-playtest-win-unpacked" win
bash "$SCRIPT_DIR/build-steam-target.sh" "Steam Playtest Linux" 4876760 "steam-playtest-linux-unpacked" linux
