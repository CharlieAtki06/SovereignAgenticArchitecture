---
title: Reasoning escalation
sidebar_position: 5
---

# Flow — escalating to the Reasoning Plane

A governed capability can borrow a larger model without giving the Edge a new
route to that model or to enterprise data. The Governance Gateway remains the
only mediator: it admits one bounded outer invocation, keeps declared context
server-side, and controls exactly what the Reasoning Plane can receive or ask
for.

> **Current evidence status.** The reasoning connector and disclosure contracts
> are implemented. Single-shot Ollama reasoning is live-proven. Autonomous use
> of disclosed tools is configured and covered by automated tests, but is not
> yet live-proven. At the pinned Zone 2 revision, the NHS and Northstar
> Integration Definitions contain no reasoning disclosures and remain denied to
> the Reasoning Plane. The NHS live demo therefore demonstrates the core
> governed workspace flow, not autonomous large-model tool use.

Vocabulary is defined in the [glossary](../glossary.md). The exact cross-zone
payload boundary is defined in the
[data boundary and projection contract](../data-boundary-and-projection-contract.md).

## The governed sequence

<ArchitectureView viewId="flow_reasoning_overview" mode="embedded" />

The detailed engineering flow is available below.

<ArchitectureView viewId="flow_reasoning_disclosure" mode="embedded" />

1. Edge invokes a model-visible reasoning capability through the published MCP
   interface. The local model never contacts the Reasoning Plane directly.
2. Zone 2 authenticates the caller and evaluates policy for the outer
   capability invocation.
3. If admitted, the Capability Orchestrator calls the Zone 3 Reasoning
   Connector with the compiled Invocation Disclosure.
4. The Gateway retains declared identity, subject, tenant, and routing values as
   server-side context. It sends only the reviewed, transformed inputs and tool
   schemas named by that disclosure.
5. If the larger model asks for a tool, it can name only a permitted opaque tool
   identifier. The Reasoning Connector resolves that identifier to an installed
   connector and supplies any bound inputs from retained context.
6. The tool subcall stays inside the admitted outer invocation. It does not
   re-enter the public MCP interface and does not receive a fresh policy
   decision.
7. The Gateway filters and transforms tool-result fields, enforces all budgets,
   and projects the completed private outcome for the model and human audiences.

## What the Integration Definition controls

A reviewed JSON Integration Definition may declare:

- the reasoning-backed capability;
- the Invocation Disclosure used by that capability;
- which outer inputs are disclosed and which remain retained;
- the exact Tool Disclosures the larger model may use;
- the public result fields and installed transformations each tool may reveal;
- model-round, tool-call, size, and deadline budgets; and
- the final response field that returns from the reasoning invocation.

The definition is configuration, not executable integration code. It cannot add
a connector implementation, credentials, endpoints, SQL, or an uninstalled
transformation. Those remain installed deployment code and configuration.

There is no implicit reasoning access. Capabilities without an approved
reasoning role remain denied, and a compiler error prevents invalid disclosure
references from becoming an active Integration Snapshot.

## Retained context and disclosed input

Invocation inputs are deliberately partitioned:

- **Disclosed inputs** are reviewed fields transformed into the model-facing
  request.
- **Retained inputs** stay inside the Gateway and can be bound into an allowed
  connector call without becoming model-controlled arguments.

This distinction lets a tool operate for a server-selected subject without
revealing that subject identifier to the larger model or allowing the model to
substitute another one. It does not mean that the model sees no enterprise
information: it sees the precise subset approved by the compiled disclosures.

## Field filtering and budgets

A tool-result field reaches the Reasoning Plane only when all of the following
are true:

1. it is public in the governed capability result contract;
2. it is named in the Tool Disclosure;
3. its declared transformation is installed and compatible; and
4. the active invocation remains within its compiled budgets.

Projection-private fields are structurally undisclosable. The Gateway also
enforces bounds for model rounds, tool calls, individual and cumulative tool
results, total invocation size, and elapsed time. These controls are applied by
Zone 2 around the model; they are not delegated to the model.

## One admission, two different controls

Two mechanisms apply at different moments:

- **Outer policy admission** decides whether the reasoning-backed capability may
  run for this caller and request.
- **Compiled disclosures and budgets** constrain the model and any tool subcalls
  inside that admitted invocation.

The second mechanism is not a hidden second policy evaluation. Disclosed tool
calls go directly through the connector layer under the retained outer
admission, and Zone 2 strips their results inline.

## The two audiences still remain separate

The completed outcome uses the same audience split as every App-enabled
capability:

- the local model receives a compact **Model Observation** admitted to model
  history; and
- the person may receive a separate authorised **App Presentation**, which is
  response-scoped and is not placed in model history or Edge Checkpoints.

Neither audience receives the private Governed Outcome wholesale.

## Pinned implementation evidence

These links require access to the private Zone 2 repository and resolve to the
revision pinned by `architecture/evidence.lock.json`.

| Topic | Evidence |
|---|---|
| Disclosure decision and rationale | [ADR-0031 — explicit reasoning disclosures](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo/blob/0ad691dfbb9095d7b2d786a53ef22afdd7a1e9c6/docs/adr/0031-explicit-reasoning-disclosures-and-runtime-catalogue-port.md) |
| Threat model | [Reasoning disclosure threat model](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo/blob/0ad691dfbb9095d7b2d786a53ef22afdd7a1e9c6/docs/security/reasoning-disclosure-threat-model.md) |
| Authoring rules and generic JSON example | [Reasoning author guide](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo/blob/0ad691dfbb9095d7b2d786a53ef22afdd7a1e9c6/docs/dev/integration-definition-v2-reasoning-author-guide.md) |
| Reasoning Plane connector boundary | [ADR-0015 — Zone 3 as a capability connector](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo/blob/0ad691dfbb9095d7b2d786a53ef22afdd7a1e9c6/docs/adr/0015-zone3-as-capability-connector.md) |
| Pinned NHS configuration | [NHS Integration Definition](https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo/blob/0ad691dfbb9095d7b2d786a53ef22afdd7a1e9c6/examples/integration-definition-seeds/nhs.seed.json) |
