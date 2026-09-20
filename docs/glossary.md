---
title: Glossary
description: Canonical cross-zone language and the code terms it maps to.
---

# Glossary

This page is the single source of truth for cross-zone language. The audience
labels improve explanation and do not rename existing code identifiers.

## Trust and deployment zones

| Canonical term | Code shorthand | Meaning |
|---|---|---|
| **Edge — Zone 1** | `zone1` | Trust/deployment zone on or near the user's device. It contains experiences and the local runtime, but no enterprise connector. |
| **Edge Experience** | desktop, CLI/TUI, iOS, embedded web | A user-facing client of the Edge Runtime. |
| **Edge Runtime** | `runtime/src/zone1` | Local model, LangGraph orchestration, MCP client, Edge Checkpointing, and App hosting. |
| **Local Function-calling Model (SLM)** | Edge local model | A small model that interprets the person's request and selects from model-visible governed capabilities. It is not the enterprise domain reasoner and does not receive unrestricted enterprise data. |
| **Governance Gateway — Zone 2** | `zone2` | Deterministic authentication, policy, audit, connector execution, and result projection. It is not a reasoning agent. |
| **Enterprise Intelligence & Resources — Zone 3** | connector targets | Enterprise-owned reasoning and data reached only through Gateway connectors. |
| **Reasoning Plane** | Zone 3 reasoning provider | The large reasoning model. It receives bounded input and only the tools disclosed for an admitted invocation. |
| **Systems of Record** | FHIR, SQL, documents, third-party services | Enterprise sources behind the Gateway connector boundary. |

The zones are trust/deployment zones, not Domain-Driven Design bounded
contexts. Their bounded contexts and relationships are recorded in the root
[context map](/project/CONTEXT-MAP).

## State and snapshots

| Term | Meaning |
|---|---|
| **Integration Definition** | Authored description of capabilities, policy, projections, Apps, connector bindings, and reasoning disclosures for one integration. JSON, typed definitions, and reviewed seed packages all declare configuration; they do not contain executable adapters, credentials, URLs, SQL, or arbitrary connector code. |
| **Integration Snapshot** | Immutable, digest-identified compilation of an Integration Definition. A Gateway process activates one integration. |
| **Edge Checkpoint** | Persisted local LangGraph conversation/orchestration state. It is not deployment configuration and is not an Integration Snapshot. |
| **Visual-test snapshot** | A committed reference image used by UI regression tests. It proves visual output only and has no runtime role. |

Use the qualified term every time; do not write “snapshot” when readers could
reasonably mean more than one of these.

## Tools and actions

| Term | Meaning |
|---|---|
| **Model-visible capability tool** | A governed MCP capability published by the Gateway and discoverable by the local Edge model. |
| **Disclosed reasoning tool** | A connector operation exposed to the Reasoning Plane only for the current admitted invocation through compiled Invocation and Tool Disclosures. A subcall uses retained context and budgets and does not take a fresh policy decision. |
| **Host-only App action** | A human action originating in the sandboxed App surface and continued by the Edge host over a separate governed MCP surface. It is never placed in a model tool catalogue. |

These are separate security surfaces. “Tool” without a qualifier is too
ambiguous for a contract or architecture statement.

## Outcomes and presentation

| Term | Meaning |
|---|---|
| **Governed Outcome** | The full internal result inside the Gateway. It never crosses to Edge wholesale. |
| **Model Observation** | Compact model-visible projection of a governed result. |
| **App Presentation** | Authorised human-facing projection carried by an App-enabled completion. |
| **Desktop Prefab overlay** | The current desktop rendering surface that displays an App Presentation. It is a host implementation, not the cross-zone payload. |
| **Opaque lifecycle metadata** | Identifiers and continuation state that Edge may carry without learning private Gateway state. |

The exact App envelope exists only in the
[data boundary and projection contract](data-boundary-and-projection-contract.md).

## Governance and reasoning

| Term | Meaning |
|---|---|
| **Capability** | One governed operation: the unit of discovery, policy, execution, audit, and projection. |
| **Invocation Disclosure** | Compiled definition of what the Reasoning Plane receives initially and which reasoning tools it may request. |
| **Tool Disclosure** | Compiled definition of the fields and transformations permitted in a reasoning-tool result. |
| **Projection-private field** | A field that must not be exposed in an audience projection or disclosure. |
| **Connector boundary** | Gateway-owned ports and adapters through which all Zone 3 work is executed. |

## Profiles and integrations

| Qualified term | Meaning |
|---|---|
| **Demo profile** | Root orchestration selecting a demonstrator stack, realm, and dependency wiring. |
| **Edge deployment profile** | Edge hardening and provider constraints for a deployment. |
| **Connector profile** | Closed configuration for a connector adapter, such as a FHIR endpoint and mapping. |
| **Integration** | The use case served by one Gateway process, such as NHS or Northstar. A process does not dynamically multiplex active integrations. |

## Evidence language

| Term | Allowed values |
|---|---|
| **Maturity** | `implemented`, `prototype`, `planned`, `scaffold`, `external` |
| **Verification** | `live`, `automated`, `source`, `design` |

Maturity describes what exists; verification describes how the claim was
proved. Never collapse them into one status.
