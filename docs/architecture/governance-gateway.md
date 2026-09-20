---
title: Governance Gateway — Zone 2
sidebar_position: 2
---

# Governance Gateway — Zone 2

The Governance Gateway is a deterministic governance runtime. It authenticates,
admits, records, executes, and projects requests; it is not a reasoning agent.

<ArchitectureView viewId="gateway_runtime" mode="embedded" />

## Bounded contexts

The Gateway is one trust zone containing several bounded contexts with separate
ownership: Request Management, Identity Trust, Policy Governance, Capability
Registry, Capability Execution, Integration Administration, App Interaction,
Reasoning Mediation, and Provenance Audit. The root
[`CONTEXT-MAP.md`](/project/CONTEXT-MAP) records their relationships; the zones
themselves are not bounded contexts.

Request Management owns the governed lifecycle. Admission state and its outbox
event commit together. Connector execution happens after that transaction, and
client/audit projections are derived from committed events. Integration
Administration compiles immutable definitions and installs one active catalogue
generation for the process.

## Published and internal seams

- MCP is the published language consumed by Edge clients.
- Anti-corruption mapping at the Edge rejects invalid or widened envelopes.
- Connector ports isolate enterprise SDKs and protocols from the governed
  lifecycle.
- Invocation and Tool Disclosures constrain the Reasoning Plane inside an
  admitted request.
- Projectors derive Model Observation and App Presentation independently from
  the internal Governed Outcome.

The exact cross-zone payload semantics live only in the
[data-boundary contract](../data-boundary-and-projection-contract.md).
