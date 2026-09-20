#!/usr/bin/env bash
# Regenerate committed Graphify viewers from the exact evidence-lock revisions.
# Source archives and Graphify output live only in a temporary directory; the
# zone checkouts are never modified.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCK="$ROOT/architecture/evidence.lock.json"
ZONE1="$ROOT/../SovereignAgenticArchitectureZoneOne"
ZONE2="$ROOT/../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo"

usage() {
  cat <<'EOF'
Usage: ./scripts/generate-graphs.sh [--zone1 PATH] [--zone2 PATH]

The paths identify local Git object stores. Files are always extracted from
the immutable commits in architecture/evidence.lock.json, regardless of the
branches currently checked out at those paths.
EOF
}

while (($#)); do
  case "$1" in
    --zone1)
      [[ $# -ge 2 ]] || { echo "--zone1 requires a path" >&2; exit 2; }
      ZONE1="$2"
      shift 2
      ;;
    --zone2)
      [[ $# -ge 2 ]] || { echo "--zone2 requires a path" >&2; exit 2; }
      ZONE2="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

for command in git graphify node tar; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "$command is required to regenerate the code graphs." >&2
    [[ "$command" == graphify ]] && echo "Install it with: uv tool install graphifyy && graphify install" >&2
    exit 1
  fi
done

[[ -f "$LOCK" ]] || { echo "Evidence lock not found: $LOCK" >&2; exit 1; }

lock_value() {
  node -e '
    const fs = require("node:fs");
    const lock = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const value = lock.repositories[process.argv[2]][process.argv[3]];
    if (typeof value !== "string" || value.length === 0) process.exit(1);
    process.stdout.write(value);
  ' "$LOCK" "$1" "$2"
}

ZONE1_COMMIT="$(lock_value zone1 commit)"
ZONE2_COMMIT="$(lock_value zone2 commit)"

TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/sovereign-graphs.XXXXXX")"
trap 'rm -rf "$TEMP_ROOT"' EXIT

archive_revision() {
  local name="$1"
  local repository="$2"
  local commit="$3"
  local destination="$4"

  if ! git -C "$repository" cat-file -e "${commit}^{commit}" 2>/dev/null; then
    echo "$name: locked commit $commit is unavailable in $repository" >&2
    exit 1
  fi

  mkdir -p "$destination"
  git -C "$repository" archive --format=tar "$commit" | tar -xf - -C "$destination"
}

generate_viewer() {
  local name="$1"
  local source="$2"
  local destination="$3"

  echo "Generating $name graph from a clean locked archive..."
  (
    cd "$source"
    graphify .
  )

  local generated="$source/graphify-out/graph.html"
  [[ -s "$generated" ]] || { echo "$name: Graphify did not create graphify-out/graph.html" >&2; exit 1; }
  mkdir -p "$(dirname "$destination")"
  cp "$generated" "$destination"
}

ZONE1_SOURCE="$TEMP_ROOT/source-zone1"
ZONE2_SOURCE="$TEMP_ROOT/source-zone2"
STAGED_GRAPHS="$TEMP_ROOT/graphs"

archive_revision "Zone 1" "$ZONE1" "$ZONE1_COMMIT" "$ZONE1_SOURCE"
archive_revision "Zone 2" "$ZONE2" "$ZONE2_COMMIT" "$ZONE2_SOURCE"
generate_viewer "Zone 1" "$ZONE1_SOURCE" "$STAGED_GRAPHS/zone1/graph.html"
generate_viewer "Zone 2" "$ZONE2_SOURCE" "$STAGED_GRAPHS/zone2/graph.html"

GRAPHIFY_VERSION="$(graphify --version 2>/dev/null | head -n 1 | tr -d '\r' || true)"
[[ -n "$GRAPHIFY_VERSION" ]] || GRAPHIFY_VERSION="unknown"

node - "$STAGED_GRAPHS" "$LOCK" "$GRAPHIFY_VERSION" <<'NODE'
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const [outputRoot, lockPath, rawVersion] = process.argv.slice(2);
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

function inspectViewer(zone) {
  const viewer = path.join(outputRoot, zone, 'graph.html');
  const html = fs.readFileSync(viewer, 'utf8');
  const match = html.match(/const RAW_NODES = (\[.*?\]);\s*const RAW_EDGES = (\[.*?\]);/s);
  if (!match) throw new Error(`Cannot find Graphify node/edge payload in ${viewer}`);
  return {
    nodes: JSON.parse(match[1]).length,
    edges: JSON.parse(match[2]).length,
    sha256: crypto.createHash('sha256').update(html).digest('hex'),
  };
}

const manifest = {
  generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  generator: {
    name: 'graphifyy',
    version: rawVersion.replace(/^graphify(?:y)?\s+/i, '').trim(),
    mode: 'code-only',
    limitation: 'Community labels use deterministic placeholders when regeneration is offline; use search and source-file paths for code navigation.',
  },
  sources: {},
};

for (const zone of ['zone1', 'zone2']) {
  const details = inspectViewer(zone);
  manifest.sources[zone] = {
    repository: lock.repositories[zone].repositoryUrl.replace(/\.git$/, ''),
    commit: lock.repositories[zone].commit,
    extraction: 'clean git archive',
    nodes: details.nodes,
    edges: details.edges,
    viewer: `${zone}/graph.html`,
    sha256: details.sha256,
  };
}

fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
NODE

# Replace committed outputs only after both viewers and the manifest succeed.
# Graphify's CDN tag remains here; portal/scripts/stage-graphs.mjs replaces it
# with the locally bundled vis-network asset in the published portal.
mkdir -p "$ROOT/docs/graphs/zone1" "$ROOT/docs/graphs/zone2"
cp "$STAGED_GRAPHS/zone1/graph.html" "$ROOT/docs/graphs/zone1/graph.html"
cp "$STAGED_GRAPHS/zone2/graph.html" "$ROOT/docs/graphs/zone2/graph.html"
cp "$STAGED_GRAPHS/manifest.json" "$ROOT/docs/graphs/manifest.json"

node "$SCRIPT_DIR/verify-graphs.mjs"

echo "Graph viewers regenerated from evidence.lock.json pins."
echo "  Zone 1: $ZONE1_COMMIT"
echo "  Zone 2: $ZONE2_COMMIT"
