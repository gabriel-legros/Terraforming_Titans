#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WINDOWS_DEPOT_ID="${STEAM_WINDOWS_DEPOT_ID:-${STEAM_DEPOT_ID:-4876761}}"
LINUX_DEPOT_ID="${STEAM_LINUX_DEPOT_ID:-4876762}"

exec bash "$SCRIPT_DIR/upload-steam-target.sh" \
  "Terraforming Titans Playtest" \
  4876760 \
  "$WINDOWS_DEPOT_ID" \
  "steam-playtest-win-unpacked" \
  "TerraformingTitansPlaytest" \
  "build-steam-playtest.sh" \
  "$LINUX_DEPOT_ID:steam-playtest-linux-unpacked:linux"
