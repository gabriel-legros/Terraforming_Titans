#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WINDOWS_DEPOT_ID="${STEAM_WINDOWS_DEPOT_ID:-${STEAM_DEPOT_ID:-4864001}}"
LINUX_DEPOT_ID="${STEAM_LINUX_DEPOT_ID:-4864002}"
export STEAM_PLATFORMS=all

exec bash "$SCRIPT_DIR/upload-steam-target.sh" \
  "Terraforming Titans" \
  4864000 \
  "$WINDOWS_DEPOT_ID" \
  "steam-win-unpacked" \
  "TerraformingTitans" \
  "build-steam.sh" \
  "production" \
  "$LINUX_DEPOT_ID:steam-linux-unpacked:linux"
