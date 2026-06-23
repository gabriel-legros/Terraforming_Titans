#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/upload-steam-target.sh" "Terraforming Titans Playtest" 4876760 "${STEAM_DEPOT_ID:-4876761}" "steam-playtest-win-unpacked" "TerraformingTitansPlaytest" "build-steam-playtest.sh"
