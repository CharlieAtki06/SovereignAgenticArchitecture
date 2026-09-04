# ADR-0005: Demo profiles are deployment orchestration, not a runtime seam

## Status

Accepted.

## Decision

The local NHS Care and Northstar Infrastructure Operations demonstrations are
selected by root-workspace Make targets. A profile composes independent
configuration at its owning boundary:

| Boundary | Owned configuration |
|---|---|
| Zone 1 brand manifest | appearance, copy and native product identity |
| Zone 1 desktop deployment policy | selected brand and host-only OIDC client connection |
| Zone 2 compose overlay | realm export, domain module, connector and governed data source |
| Root Makefile | named local lifecycle orchestration only |

Root `demo-up-*` starts the selected Zone 2 stack and the containerised generic
edge. Root `desktop-up-*` starts the selected Zone 2 stack and launches the desktop,
whose local sidecar is the only edge process for that workflow.

## Consequences

Zone 1 never imports Zone 2 compose files or realm exports. Brand manifests never
contain identity, realm, role, purpose, endpoint, plugin or capability data. Zone 2
does not select a brand or configure desktop UI. The desktop renderer sees only a
safe presentation projection; its OIDC settings remain in the Rust host.

Only one local profile owns standard ports at a time. Adding a new demo requires a
new realm export, Zone 2 overlay/module, Zone 1 brand and deployment policy, root
orchestration aliases, acceptance documentation, and boundary tests; it does not
change the MCP contract.
