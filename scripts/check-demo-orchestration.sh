#!/usr/bin/env bash
# Static regression check for root profile orchestration. This intentionally
# uses make's dry-run output: no container, desktop, or network state changes.
set -euo pipefail

root_dir=$(cd "$(dirname "$0")/.." && pwd)

assert_contains() {
  local target=$1
  local expected=$2
  local output
  output=$(make -C "$root_dir" -n "$target")
  if [[ $output != *"$expected"* ]]; then
    echo "$target did not contain expected command fragment: $expected" >&2
    exit 1
  fi
}

assert_contains demo-up-nhs "ZONE2_NETWORK=sovereign-zone2-nhs"
assert_contains demo-up-infrastructure "ZONE2_NETWORK=sovereign-zone2-infrastructure"
assert_contains demo-rebuild-nhs "--rebuild"
assert_contains demo-rebuild-infrastructure "--rebuild"
assert_contains desktop-up-nhs "desktop-dev-governed DEPLOYMENT_POLICY=nhs"
assert_contains desktop-up-nhs "uv sync --all-groups --all-extras"
assert_contains desktop-reset-nhs "demo-reset-nhs"
assert_contains desktop-reset-nhs "desktop-dev-governed DEPLOYMENT_POLICY=nhs"
assert_contains desktop-up-infrastructure "DEPLOYMENT_POLICY=northstar-infrastructure"
assert_contains demo-worker-logs-nhs "demo-worker-logs-nhs"
assert_contains demo-worker-logs-infrastructure "demo-worker-logs-infrastructure"
assert_contains assert-no-container-edge "ps --format"

zone2_dir="$root_dir/../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo"

assert_zone2_lifecycle() {
  local target=$1
  local expected=$2
  local output
  output=$(make -C "$zone2_dir" -n "$target")
  if [[ $output != *"scripts/run-demo-profile.sh"* || $output != *"$expected"* ]]; then
    echo "$target must use the bounded Zone 2 demo lifecycle with $expected" >&2
    exit 1
  fi
  if [[ $output == *"compose up -d"* && $output != *"--no-deps"* ]]; then
    echo "$target contains an unbounded Compose dependency start" >&2
    exit 1
  fi
}

assert_zone2_lifecycle demo-up-nhs "--extra-service mock-fhir"
assert_zone2_lifecycle demo-rebuild-nhs "--rebuild"
assert_zone2_lifecycle demo-up-infrastructure "northstar-infrastructure-demo"
assert_zone2_lifecycle demo-rebuild-infrastructure "--rebuild"

desktop_output=$(make -C "$root_dir" -n desktop-up-nhs)
if [[ $desktop_output == *"zone1) up -d"* ]]; then
  echo "desktop-up-nhs must not start the containerised Zone 1 edge" >&2
  exit 1
fi
