# Sovereign Agentic Architecture

[Zone 1 — Edge Runtime](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneOne) · [Zone 2 — Governed Layer](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo) · [ADRs](docs/adr/README.md) · [Contributing](CONTRIBUTING.md)

---

## Introduction

### The problem this architecture solves

Enterprise AI applications have a fundamental tension: the AI model needs access to sensitive data to be useful, but giving it unrestricted access is unsafe, unauditable, and non-compliant. You cannot explain what the model accessed, why, or whether it was authorised to do so.

The three-zone architecture resolves this by separating three distinct concerns into three distinct layers, each with a clear and limited responsibility. The governance layer — Zone 2 — is the only path to enterprise data. Every request is authenticated, policy-evaluated, and recorded before any data moves.

---

## The three zones

**Zone 1 — the edge runtime**
A lightweight, local function-calling model running inside a LangGraph agentic framework. Its job is to understand what the user wants and translate it into a structured, governed request. It cannot access data directly. Every capability it invokes goes through Zone 2's MCP server.

**Zone 2 — the governance and mediation layer**
The gatekeeper. Authenticates callers, evaluates policy deterministically, records every decision to an immutable audit log, executes the appropriate enterprise connector, and strips responses to only the fields the caller is permitted to see. The sole source of truth for which capabilities and MCP Apps exist.

**Zone 3 — the reasoning model and enterprise data sources**
The large reasoning LLM and the enterprise data sources it orchestrates (FHIR APIs, SQL databases, third-party services). Only reachable through Zone 2's connector boundary — never directly from Zone 1.

```mermaid
flowchart LR
    User(("User"))

    subgraph Z1["Zone 1 — Edge Runtime"]
        Wrapper["Client wrapper\nFlutter shell"]
        Runtime["Edge runtime\nlocal model · LangGraph · MCP client"]
        Wrapper -. "EdgeRuntime facade" .-> Runtime
    end

    User --> Wrapper
    Runtime -- "authenticated MCP" --> Z2["Zone 2\nGoverned mediation"]
    Z2 --> Enterprise[("Enterprise systems")]
    Z2 --> Z3["Zone 3\nReasoning model"]

    style Runtime fill:#2b6cb0,color:#fff
    style Z2 fill:#c05621,color:#fff
    style Z3 fill:#6b46c1,color:#fff
```

**The boundary that must never be crossed:** Zone 1 consumes Zone 2 exclusively through its published MCP interface. Zone 1 must never import Zone 2 source code, call Zone 2's internal Python functions, or bypass the MCP transport for any reason.

---

## Repository structure

This architecture spans three repositories:

| Repository | Purpose |
|---|---|
| [SovereignAgenticArchitecture](https://github.com/CharlieAtki06/SovereignAgenticArchitecture) | This repo. VS Code workspace, cross-zone docs, onboarding. |
| [SovereignAgenticArchitectureZoneOne](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneOne) | Edge runtime: local model, LangGraph, MCP client, Flutter shell. |
| [SovereignAgenticArchitectureZoneTwo](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo) | Governed mediation: policy engine, audit, connectors, MCP server. |

Each zone retains its own `.git`, CI pipeline, dependencies, and releases. This is not a monorepo.

---

## Getting started

### Prerequisites

- Git
- [uv](https://docs.astral.sh/uv/) (Zone 2 Python toolchain)
- Docker or Podman (Zone 2 infrastructure)
- Flutter SDK (Zone 1 client shell, optional)

### Setup

```bash
git clone https://github.com/CharlieAtki06/SovereignAgenticArchitecture.git
cd SovereignAgenticArchitecture
./setup.sh
```

`setup.sh` clones Zone 1 and Zone 2 as siblings and opens the VS Code workspace. After it completes, your directory layout will be:

```
Dev/
├── SovereignAgenticArchitecture/          ← this repo (root envelope)
│   └── SovereignAgenticArchitecture.code-workspace
├── SovereignAgenticArchitectureZoneOne/   ← Zone 1
│   └── SovereignAgenticArchitectureZoneOne/
└── Sovereign-Agentic-Architecture/        ← Zone 2
    └── SovereignAgenticArchitectureZoneTwo/
```

Open `SovereignAgenticArchitecture.code-workspace` in VS Code to see both zones together.

### Running Zone 2 locally

```bash
cd ../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo
make install
make db-up
make migrate
make dev       # API on http://localhost:8000
```

### Running the full system (both zones)

`make up` brings up the whole stack — shared infra (Postgres, Redis, Keycloak),
Zone 2 (governed, **real OIDC auth**), the mock FHIR backend, and the containerised
Zone 1 edge. The full system spans two compose projects: Zone 2 (its own repo) and
the Zone 1 edge (this repo's `docker-compose.yml`, an overlay that joins Zone 2's
`sovereign-zone2` network). `make up` sequences them — Zone 2 first (it creates the
network), then the edge on top.

```bash
./setup.sh                 # clone both zones side-by-side (first time)
# start an Ollama server on the host with the edge model, then:
make up                    # from this repo root — brings up both projects
# drive it from the host (real Keycloak user token → governed Zone 2 access):
cd ../SovereignAgenticArchitectureZoneOne
uv run zone1 chat --as-user clinician-a --secret dev-secret
```

Requires a host Ollama (the model runtime is not containerised —
`ZONE1_MODEL_ENDPOINT` points at it). `--secret` is the edge host's local
transport secret (`X-Host-Secret`), **not** the identity credential — identity is
the Keycloak OIDC token the CLI registers via `--as-user`.

> **Why `make up` and not a single `podman compose up`?** The natural one-command
> form would be a root compose that `include:`s Zone 2's, but podman-compose does
> not rebase relative paths from `include:`d files (Zone 2's Keycloak realm mount
> and build contexts break). The overlay-plus-`make` approach sidesteps that and
> leaves each zone's compose standing alone for zone-local development. Under
> Docker Compose native, `include:` rebasing works if you prefer that route.

### Running Zone 1 locally (against a local Zone 2)

Run Zone 2's stack (`podman compose up -d` in the Zone 2 repo — OIDC by default),
start a host Ollama, then run the edge host with `ZONE1_*` env (see
`zone1.bootstrap.settings`) or the `zone1 chat` CLI.

---

## Codebase graphs

Interactive knowledge graphs generated by [graphify](https://github.com/Graphify-Labs/graphify) — open in a browser to explore each zone's module structure, call chains, and bounded context relationships.

| Zone | Interactive viewer |
|---|---|
| Zone 1 — Edge Runtime | [docs/graphs/zone1/graph.html](docs/graphs/zone1/graph.html) |
| Zone 2 — Governed Mediation | [docs/graphs/zone2/graph.html](docs/graphs/zone2/graph.html) |

Regenerate both viewers after significant changes:

```bash
./scripts/generate-graphs.sh   # requires: uv tool install graphifyy && graphify install
```

Per-zone AI context (`graphify-out/graph.json`) lives in each zone's repo and is gitignored. Open a Claude Code session in the relevant zone and run `/graphify .` to rebuild it.

---

## Documentation

| Document | Contents |
|---|---|
| [ADRs](docs/adr/README.md) | Cross-zone architecture decisions that belong to neither zone alone |
| [Contributing](CONTRIBUTING.md) | How to work across both repos, coordinate MCP contract changes, and open PRs |
| [Zone 1 docs](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneOne/tree/main/docs) | Architecture, flows, runtime/wrapper boundary, MCP integration, security model |
| [Zone 2 docs](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo/tree/main/docs) | Architecture, flows, module guide, FastMCP Apps, configuration |
