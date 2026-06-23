#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/upload-steam-target.sh" "Terraforming Titans" 4864000 "${STEAM_DEPOT_ID:-4864001}" "steam-win-unpacked" "TerraformingTitans" "build-steam.sh"
