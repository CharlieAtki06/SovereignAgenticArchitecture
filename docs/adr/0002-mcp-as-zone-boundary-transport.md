# ADR 0002 — MCP as the Zone 1 → Zone 2 transport boundary

**Status:** Accepted

## Context

Zone 1 needs to invoke capabilities managed by Zone 2. A decision was needed on the protocol and shape of that interface. Options considered: direct HTTP REST calls, a shared Python library, gRPC, and MCP (Model Context Protocol).

## Decision

Zone 2 exposes all capabilities through an MCP server. Zone 1 is an MCP client. This is the only sanctioned interface between the two zones.

Zone 1 must never import Zone 2 source code, call Zone 2 internal functions directly, or replicate Zone 2 policy logic locally.

## Consequences

- The capability interface is machine-discoverable: Zone 1 learns what Zone 2 exposes at runtime, not at compile time.
- Zone 2 capabilities, MCP Apps, and governance rules can be updated without redeploying or retraining Zone 1.
- Zone 1 remains independently deployable and can be embedded in any host without a Zone 2 source dependency.
- The transport boundary is testable: Zone 1 integration tests can run against a fake MCP server; Zone 2 contract tests can verify its MCP schema without a real Zone 1 client.
- Adding a new enterprise capability in Zone 2 is invisible to Zone 1 until Zone 1 opts in through capability discovery.
