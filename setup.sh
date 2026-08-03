#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

echo "Sovereign Agentic Architecture — workspace setup"
echo ""

# Zone 1
ZONE1_DIR="$ROOT/SovereignAgenticArchitectureZoneOne"
if [ -d "$ZONE1_DIR" ]; then
  echo "Zone 1 already cloned — pulling latest"
  git -C "$ZONE1_DIR" pull --ff-only
else
  echo "Cloning Zone 1..."
  git clone https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneOne.git "$ZONE1_DIR"
fi

# Zone 2
ZONE2_DIR="$ROOT/Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo"
if [ -d "$ZONE2_DIR" ]; then
  echo "Zone 2 already cloned — pulling latest"
  git -C "$ZONE2_DIR" pull --ff-only
else
  echo "Cloning Zone 2..."
  mkdir -p "$ROOT/Sovereign-Agentic-Architecture"
  git clone https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo.git "$ZONE2_DIR"
fi

echo ""
echo "Done. Open the workspace in VS Code:"
echo "  code \"$SCRIPT_DIR/SovereignAgenticArchitecture.code-workspace\""
