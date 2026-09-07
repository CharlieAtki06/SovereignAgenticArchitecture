# Contributing

## Repository overview

This architecture spans three repositories. Each has independent CI, dependencies, and release cadence.

| Repo | What changes here |
|---|---|
| `SovereignAgenticArchitecture` (this repo) | Workspace file, cross-zone docs, ADRs, onboarding |
| `SovereignAgenticArchitectureZoneOne` | Edge runtime, LangGraph orchestration, Tauri desktop shell, MCP client |
| `SovereignAgenticArchitectureZoneTwo` | Policy engine, audit, connectors, MCP server, Zone 3 integration |

---

## Working locally

Run `./setup.sh` from this repo to clone both zones as siblings and get the VS Code workspace. See [README](README.md) for full setup steps.

---

## The MCP transport boundary

Zone 1 and Zone 2 are connected exclusively through Zone 2's MCP server. This is the only sanctioned interface between them.

**Zone 1 must never:**
- Import Zone 2 source code
- Call Zone 2 internal Python functions directly
- Reproduce Zone 2 policy logic locally
- Access enterprise systems or Zone 3 without going through Zone 2

Any change that touches this boundary requires coordinated PRs in both repos. Open both PRs at the same time and link them to each other. The Zone 2 change (server-side) should be merged first; the Zone 1 change (client-side) second.

Read the [data boundary and projection contract](docs/data-boundary-and-projection-contract.md)
before changing MCP results or Apps. App-enabled `structured_content` is a
closed `{status, request_id, zone2_app}` envelope. The producer must not send a
governed `result` or Projection-Private Field, and the consumer must reject
unknown siblings. Contract PRs must include producer and consumer canary tests
that inspect the complete MCP response.

---

## PR conventions

**Zone-internal changes** (most changes) — PR in the relevant zone repo only. No cross-repo coordination needed.

**MCP contract changes** — open PRs in both zone repos simultaneously. Label both with `mcp-contract-change` and link them. Merge order: Zone 2 first, Zone 1 second.

**Cross-zone docs and ADRs** — PR in this root repo.

---

## Cross-zone ADRs

Architecture decisions that span both zones or govern the boundary between them live in [`docs/adr/`](docs/adr/README.md). Zone-internal decisions live in each zone's own `docs/adr/` directory.

Open a PR in this repo to propose or record a cross-zone ADR.

---

## Quality gates

Each zone enforces its own quality gates. Before raising a PR in either zone, run:

**Zone 2:**
```bash
make quality   # lint + typecheck + architecture + full test suite
```

**Zone 1:**
```bash
make quality
```

The architecture gate (`import-linter`) is especially important — run it after any import change. It fails immediately and is unambiguous about which rule was violated.
