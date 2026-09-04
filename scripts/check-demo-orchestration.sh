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
assert_contains demo-rebuild-nhs " build"
assert_contains demo-rebuild-infrastructure " build"
assert_contains desktop-up-nhs "desktop-dev-governed DEPLOYMENT_POLICY=nhs"
assert_contains desktop-up-infrastructure "DEPLOYMENT_POLICY=northstar-infrastructure"
assert_contains demo-worker-logs-nhs "demo-worker-logs-nhs"
assert_contains demo-worker-logs-infrastructure "demo-worker-logs-infrastructure"
assert_contains assert-no-container-edge "ps --format"

desktop_output=$(make -C "$root_dir" -n desktop-up-nhs)
if [[ $desktop_output == *"zone1) up -d"* ]]; then
  echo "desktop-up-nhs must not start the containerised Zone 1 edge" >&2
  exit 1
fi
