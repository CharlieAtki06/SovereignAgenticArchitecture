# ADR-0008: App completions carry audience projections, not governed results

## Status

Accepted.

## Context

ADR-0006 separated the model observation from the App presentation inside Zone
1, but the first implementation still sent the complete post-obligation
governed result beside `zone2_app` in MCP `structured_content`. Zone 1 discarded
that result before model history. This protected the model context, but it did
not prevent projection-private cursors, subject references and source references
from physically entering Zone 1.

List capabilities also need trusted per-row values to derive opaque App-action
grants. Treating those values as public row output made their non-disclosure
depend on every individual projector, despite their being routing state rather
than audience data.

## Decision

Zone 2 owns three distinct data classes after policy obligations:

| Type | Purpose | May cross into Zone 1? |
|---|---|---|
| Governed Outcome | Audited application result used inside Zone 2 | Only for the temporary non-App semantic path |
| Model Observation | Compact text deliberately projected for the local model | Yes, only in one MCP `content` text block |
| App Presentation | Post-obligation Prefab tree deliberately projected for the authorised human | Yes, only in `structured_content.zone2_app` |
| Projection-Private Data | Top-level or per-row routing state used to build presentations and grants | No |

An initial successful App-enabled capability call has this exact MCP shape:

```json
{
  "content": [
    { "type": "text", "text": "<ModelObservation, 1..1024 code points>" }
  ],
  "structured_content": {
    "status": "completed",
    "request_id": "<governed request correlation>",
    "zone2_app": { "<post-obligation Prefab tree>": "..." }
  },
  "_meta": {
    "zone2/app_session_id": "<opaque session reference>",
    "zone2/app_action_handles": ["<opaque handles visible in this tree>"],
    "zone2/presentation_revision": 0
  }
}
```

`structured_content` is a closed envelope. `result`, `provenance`, cursors,
source references, subject references and action targets are forbidden siblings.
Zone 1 rejects an App completion with any additional key instead of ignoring it.

Projection-private values have separate typed declarations for top-level values
and list-row values. They are validated as part of the maximum Zone 2 result
contract, but are excluded from MCP discovery, model descriptions, the App tree,
the initial App completion envelope, action input, logs and audit display data.
They may be copied only into a server-held, digest-backed App-action grant.

The non-App semantic compatibility path retains the governed completion
envelope temporarily:

```json
{
  "status": "completed",
  "request_id": "...",
  "result": { "...": "bounded governed model input" },
  "provenance": { "...": "..." }
}
```

It must never be selected when `zone2_app` is present. App-action calls continue
to use the separate `/mcp/app-actions` surface and return empty `content` plus a
closed replace/reject/fail envelope as defined by ADR-0007.

```mermaid
flowchart LR
    subgraph Z2[Zone 2 — governed mediation]
        C[Connector result] --> O[Policy obligations]
        O --> G[Governed Outcome]
        G --> M[Model projector]
        G --> A[App projector]
        G --> B[Grant-binding projector]
        B --> S[(Server-held action session)]
    end

    M -->|ToolResult.content| L[Zone 1 local model]
    A -->|structured_content.zone2_app| H[Zone 1 generic App host]
    S -. private bindings are never serialized .-> N[Zone 2 boundary invariant]
    G -. governed result is forbidden on App completion .-> N
```

## Consequences

- Zone 1 cannot accidentally checkpoint, log or forward rich governed data that
  it never receives.
- Zone 2 projectors keep access to the governed outcome without teaching the
  generic MCP adapter or Zone 1 about domain fields.
- Connector output remains exhaustively typed: private routing data is explicit,
  not an unvalidated side channel.
- The semantic App wire is smaller and intentionally differs from the non-App
  compatibility envelope.
- Zone 1 and Zone 2 must be released in order: Zone 2 producer first, then the
  strict Zone 1 consumer. Rollback is to a jointly compatible safe release;
  restoring raw governed JSON to App completions is prohibited.

This ADR amends ADR-0006 by strengthening “discard in Zone 1” to “do not send to
Zone 1”. It supersedes the governed-envelope-plus-`zone2_app` placement decision
in Zone 2 ADR-0025. ADR-0007 remains unchanged.
