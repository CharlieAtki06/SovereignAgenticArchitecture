#!/usr/bin/env bash
set -euo pipefail

ROOT_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(dirname "$ROOT_REPO")"
ZONE1_DIR="$WORKSPACE_ROOT/SovereignAgenticArchitectureZoneOne"
ZONE2_PARENT="$WORKSPACE_ROOT/Sovereign-Agentic-Architecture"
ZONE2_DIR="$ZONE2_PARENT/SovereignAgenticArchitectureZoneTwo"

echo "Sovereign Agentic Architecture — workspace setup"

if [[ -d "$ZONE1_DIR/.git" ]]; then
  echo "Edge — Zone 1 already exists at $ZONE1_DIR"
elif [[ -e "$ZONE1_DIR" ]]; then
  echo "Cannot clone Zone 1: $ZONE1_DIR exists but is not a Git checkout" >&2
  exit 1
else
  git clone \
    https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneOne.git \
    "$ZONE1_DIR"
fi

if [[ -d "$ZONE2_DIR/.git" ]]; then
  echo "Governance Gateway — Zone 2 already exists at $ZONE2_DIR"
elif [[ -e "$ZONE2_DIR" ]]; then
  echo "Cannot clone Zone 2: $ZONE2_DIR exists but is not a Git checkout" >&2
  exit 1
else
  mkdir -p "$ZONE2_PARENT"
  git clone \
    https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo.git \
    "$ZONE2_DIR"
fi

echo
echo "Workspace ready. Open:"
echo "  $ROOT_REPO/SovereignAgenticArchitecture.code-workspace"
