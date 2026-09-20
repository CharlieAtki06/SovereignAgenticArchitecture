# AGENTS.md — Sovereign Agentic Architecture root

This repository is the documentation and orchestration envelope for a
three-zone enterprise AI architecture. Zone application source lives in two
separate repositories.

## Canonical zone names

- **Edge — Zone 1** contains Edge Experiences and the Edge Runtime.
- **Governance Gateway — Zone 2** authenticates, evaluates policy, audits,
  executes connectors, and projects results deterministically. It is not a
  reasoning agent.
- **Enterprise Intelligence & Resources — Zone 3** contains the Reasoning
  Plane and Systems of Record.

These are documentation labels. Do not rename existing code identifiers merely
to match them. The sole cross-zone vocabulary authority is
`docs/glossary.md`; bounded contexts and their relationships are owned by
`CONTEXT-MAP.md`.

## Boundary rule

Edge consumes the Governance Gateway exclusively through the Gateway's
published MCP interface. Edge must never import Gateway source, call Gateway
internals, reproduce Gateway policy, or access enterprise resources directly.

For an App-enabled completion, only the compact Model Observation, authorised
App Presentation, and opaque lifecycle metadata cross to Edge. The Governed
Outcome and private source, subject, cursor, action-target, provenance, and
result fields remain in the Gateway. Exact shapes live only in
`docs/data-boundary-and-projection-contract.md` and ADR-0008.

## Local repositories

| Area | Path relative to this file |
|---|---|
| Edge — Zone 1 | `../SovereignAgenticArchitectureZoneOne` |
| Governance Gateway — Zone 2 | `../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo` |

Cross-boundary interface changes require coordinated work: merge the Gateway
producer first and the Edge consumer second.

## Root ownership

This repository owns:

- `architecture/` — canonical LikeC4 topology, flows, metadata, and evidence lock;
- `docs/glossary.md` and `CONTEXT-MAP.md` — ubiquitous language and context relationships;
- `docs/adr/` — cross-zone decisions;
- `docs/data-boundary-and-projection-contract.md` — exact cross-zone payload semantics;
- `portal/` — the public Docusaurus atlas, presenter, and reference;
- `docs/graphs/` — pinned Graphify evidence viewers;
- `Makefile`, `setup.sh`, and the multi-root workspace — operator entry points.

Do not add zone source, zone-specific runtime configuration, or duplicated
zone-internal documentation here. Ordinary Markdown remains ordinary content;
architecture topology belongs in LikeC4.

## Verification

Use `make docs-check` for model, content, type, unit, build, accessibility, and
browser checks. Use `make docs-evidence` only where both private repositories
are available. Generated LikeC4 React files and staged Graphify assets are not
committed.

When `/graphify` is explicitly invoked, follow the installed Graphify skill
before doing other work. Graphify is code evidence, never the canonical public
system model.
