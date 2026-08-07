#!/usr/bin/env bash
# Regenerate graphify interactive viewers for Zone 1 and Zone 2 and copy them
# into docs/graphs/ so teammates can open them without installing graphify.
#
# Prerequisites: uv tool install graphifyy && graphify install
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
ZONE1="$ROOT/../SovereignAgenticArchitectureZoneOne"
ZONE2="$ROOT/../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo"

if ! command -v graphify &>/dev/null; then
  echo "graphify not found. Run: uv tool install graphifyy" >&2
  exit 1
fi

mkdir -p "$ROOT/docs/graphs/zone1"
mkdir -p "$ROOT/docs/graphs/zone2"

echo "→ Generating Zone 1 graph..."
(cd "$ZONE1" && graphify .)
cp "$ZONE1/graphify-out/graph.html" "$ROOT/docs/graphs/zone1/graph.html"

echo "→ Generating Zone 2 graph..."
(cd "$ZONE2" && graphify .)
cp "$ZONE2/graphify-out/graph.html" "$ROOT/docs/graphs/zone2/graph.html"

echo ""
echo "Done."
echo "  Zone 1 viewer: docs/graphs/zone1/graph.html"
echo "  Zone 2 viewer: docs/graphs/zone2/graph.html"
