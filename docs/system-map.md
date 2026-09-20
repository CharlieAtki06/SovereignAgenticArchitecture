---
title: System map
sidebar_position: 2
---

# System map

The LikeC4 model is the single source for topology. This page provides the
shortest explanatory route through its main views; select an element in the
diagram to inspect maturity, verification, limitations, and code evidence.

## The system on one screen

<ArchitectureView viewId="landscape" mode="embedded" />

Four claims are load-bearing:

1. **The Governance Gateway is the only path outward.** Edge — Zone 1 never
   reaches a system of record or the Reasoning Plane directly.
2. **Enterprise records and reasoning disclosures are different flows.** Zone 2
   may retrieve the full connector result, while the Reasoning Plane receives
   only fields named by a compiled Tool Disclosure.
3. **The Reasoning Plane has no private transport backdoor.** Its disclosed tool
   calls invoke registered Zone 2 connectors inside the already-admitted outer
   invocation. They do not re-enter MCP/HTTP and do not take a fresh policy
   decision per subcall.
4. **The local and large models occupy different trust positions.** The local
   model runs at the Edge. The Reasoning Plane is treated as outside the
   operator-controlled trust position even when the laptop demo happens to run
   both models through one Ollama process.

## Edge — Zone 1

<ArchitectureView viewId="edge_runtime" mode="embedded" />

The reference desktop combines a React experience, a Tauri host, the Python
Edge Runtime sidecar, a locally managed model endpoint, and a sandboxed Prefab
surface. React reaches sensitive host behaviour only through the finite Tauri
command interface. The model adapter returns structured tool calls; it cannot
invoke MCP itself.

Zone 1 defensively validates discovered schemas and returned App envelopes, but
it never reproduces Zone 2 policy or widens the published capability catalogue.

## Governance Gateway — Zone 2

<ArchitectureView viewId="gateway_runtime" mode="embedded" />

Zone 2 is a deterministic governance runtime, not an agent. Request Management
owns the governed lifecycle; Identity Trust, Policy Governance, Capability
Registry, Capability Execution, Integration Administration, App Interaction,
Reasoning Mediation, and Provenance Audit each own a separate bounded context.

Accepted state and its outbox event commit together. Connector work happens
outside the acceptance transaction, and client/audit projections follow the
committed lifecycle.

## Enterprise Intelligence & Resources — Zone 3

<ArchitectureView viewId="enterprise_resources" mode="embedded" />

The **Reasoning Plane** and **Systems of Record** are deliberately separate.
Both are reached only through Zone 2 connector interfaces, but the Reasoning
Plane is additionally constrained by compiled Invocation and Tool Disclosures.

## Continue

- Follow [one governed request](flows/governed-request.md).
- Inspect the [client landscape](experiences/client-landscape.md).
- See [use cases and deployments](architecture/use-cases-and-deployments.md).
- Read the normative [data-boundary contract](data-boundary-and-projection-contract.md).
