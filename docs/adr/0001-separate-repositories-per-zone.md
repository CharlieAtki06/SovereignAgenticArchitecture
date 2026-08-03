# ADR 0001 — Separate repositories per zone

**Status:** Accepted

## Context

The three-zone architecture separates concerns across distinct deployment units: Zone 1 (on-device edge runtime), Zone 2 (server-side governed mediation), and Zone 3 (reasoning model and enterprise data sources). A decision was needed on whether these should share a monorepo or live in separate repositories.

## Decision

Each zone occupies its own repository with its own `.git`, CI pipeline, dependency manifest, and release cadence.

A root envelope repository (`SovereignAgenticArchitecture`) holds the VS Code multi-root workspace, cross-zone documentation, and onboarding tooling. It does not contain zone source code.

## Consequences

- Zone 1 and Zone 2 can be deployed, released, and versioned independently.
- Each zone's CI runs only when that zone changes.
- Teams working on different zones are not blocked by each other's CI.
- The MCP interface becomes the explicit, enforced contract between zones — there is no temptation to share source code through a monorepo.
- Onboarding requires cloning multiple repos; `setup.sh` in the root envelope handles this.
