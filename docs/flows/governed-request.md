---
title: One governed request
sidebar_position: 1
---

# One governed request

Every model-visible enterprise capability follows the same outer path. The
client experience may change, but the governance path does not.

<ArchitectureView viewId="flow_governed_request" mode="embedded" />

## The path

1. An Edge Experience submits an interaction to the Edge Runtime.
2. The local model selects from the capabilities Zone 2 published for that
   session. Zone 1 validates the structured call before sending it.
3. The Governance Gateway authenticates the caller and evaluates deterministic
   policy for the capability, purpose, subject, and caller context.
4. Accepted work is persisted with its outbox record before execution is
   scheduled. A connector call is never held open inside the acceptance
   transaction.
5. The capability executor invokes the one connector bound by the active
   catalogue, applying timeout, retry, and circuit-breaker behaviour.
6. Obligations narrow the connector result and the request aggregate reaches a
   terminal state. Audit and client-facing events are projected from the
   committed outbox.
7. Zone 1 receives only the permitted projection and lets the local model finish
   the response.

## Branches that do not weaken the invariant

- **Denied:** no connector is called; the decision is audited.
- **Confirmation required:** the same admitted request is parked and resumed
  through native MCP elicitation after the human decision.
- **App-enabled:** the model and human projections are produced independently;
  see [FastMCP Apps](../fastmcp-apps-and-prefab-overlay.md).
- **Reasoning capability:** the outer request is governed normally, then the
  reasoning connector applies its compiled disclosure and budgets; see
  [reasoning escalation](reasoning-escalation.md).

The exact cross-zone result shape belongs only to the
[data-boundary contract](../data-boundary-and-projection-contract.md).
