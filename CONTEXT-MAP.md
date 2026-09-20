# Cross-zone context map

This map is the single source of truth for bounded-context ownership and
relationships. The three zones are trust/deployment boundaries; they are not
bounded contexts.

## Context ownership

| Bounded context | Owning zone | Responsibility |
|---|---|---|
| Interaction Runtime | Edge — Zone 1 | Local interaction lifecycle and orchestration state |
| Model Execution | Edge — Zone 1 | Local model invocation, output parsing, and tool translation |
| Capability Access | Edge — Zone 1 | Edge-side validation and invocation of published Gateway capabilities |
| App Hosting | Edge — Zone 1 | Sandboxed App instances and host-only action initiation |
| Offline Operation | Edge — Zone 1 | Local behavior when governed capabilities are unavailable |
| Identity & Trust | Governance Gateway — Zone 2 | Caller identity and trust attributes |
| Capability Registry | Governance Gateway — Zone 2 | Runtime capability catalogue |
| Request Management | Governance Gateway — Zone 2 | Governed request and confirmation lifecycle |
| Policy Governance | Governance Gateway — Zone 2 | Deterministic admission and obligations |
| Capability Execution | Governance Gateway — Zone 2 | Admitted capability orchestration |
| App Interaction | Governance Gateway — Zone 2 | Governed App presentation and successor actions |
| Integration Administration | Governance Gateway — Zone 2 | Definition authoring, compilation, persistence, and activation |
| Reasoning Mediation | Governance Gateway — Zone 2 | Bounded reasoning sessions and disclosure enforcement |
| Provenance & Audit | Governance Gateway — Zone 2 | Immutable decision and activity evidence |
| Offline Sync | Governance Gateway — Zone 2 | Governed reconciliation of deferred work |

The Reasoning Plane and Systems of Record are external domains. The Gateway
integrates with them through connector ports and anti-corruption mappings; it
does not absorb their models into its contexts.

## Relationships

| Upstream | Downstream | Pattern | Contract |
|---|---|---|---|
| Gateway Capability Registry | Edge Capability Access | **Published Language** | Published MCP discovery and invocation surface |
| Gateway Request Management | Edge Interaction Runtime | **Published Language** | MCP lifecycle results and native elicitation |
| Gateway App Interaction | Edge App Hosting | **Published Language** | Model Observation, authorised App Presentation, opaque lifecycle metadata, and host-only continuation |
| Edge Interaction Runtime | Edge Model Execution | **Customer/Supplier** | Local ports; orchestration depends on a vendor-neutral model contract |
| Integration Administration | Capability Registry | **Published Language** | Immutable active Integration Snapshot |
| Integration Administration | Policy Governance | **Published Language** | Compiled policies, obligations, and projections |
| Policy Governance | Capability Execution | **Conformist at admission** | Execution accepts only an admitted invocation and its obligations |
| Capability Execution | Reasoning Mediation | **Customer/Supplier** | Bounded reasoning request with retained admission context and budgets |
| Reasoning Mediation | Reasoning Plane | **Anti-Corruption Layer** | Provider-neutral reasoning connector and compiled disclosures |
| Capability Execution | Systems of Record | **Anti-Corruption Layer** | Enterprise connector ports, profiles, and domain mappings |
| All Gateway request contexts | Provenance & Audit | **Separate Ways plus event envelope** | Contexts emit audit activity without sharing persistence models |

## Non-negotiable seams

1. Edge reaches the Gateway only through its published MCP interface.
2. No Edge context imports a Gateway context or enterprise connector.
3. Policy is evaluated by Policy Governance, never reconstructed in Edge or a connector.
4. Reasoning tool subcalls stay inside the admitted invocation. They use compiled disclosures and connector ports; they do not re-enter policy as new capability requests.
5. Host-only App actions and model-visible capabilities remain separate catalogues and entry points.
6. A Gateway process activates one integration; NHS and Northstar are separate deployments.

## Change rule

Change this file when context ownership or a relationship pattern changes.
Change the LikeC4 model when topology, runtime flow, maturity, or evidence
changes. Change the normative boundary contract when payload semantics change.
