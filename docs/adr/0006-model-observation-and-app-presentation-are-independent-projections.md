# ADR-0006: Model Observation and App Presentation are independent projections

## Status

Accepted.

## Context

An App-enabled Zone 2 capability already produces two useful representations of
the same post-obligation governed outcome: compact text in MCP
`ToolResult.content`, and a rich Prefab tree in
`structured_content["zone2_app"]`. Zone 1 previously mapped the structured
result into a generic completion object and serialised that result into the
local model's LangGraph history. That breaks the intended separation and makes
future rich App views unsafe to introduce.

## Decision

For an App-enabled completed result, the two projections are independent typed
outputs at the Zone 1 MCP anti-corruption seam:

| Output | Source | Permitted consumer |
|---|---|---|
| Model Observation | exactly one non-empty `ToolResult.content` text block, at most 1,024 Unicode code points | Zone 1 local-model tool history only |
| App Presentation | `structured_content["zone2_app"]` plus the opaque `zone2/app_session_id` metadata value | authorised Zone 1 App-hosting path only |

Zone 1 validates and maps the published MCP result but does not derive one
projection from the other. It does not inspect domain fields, reapply policy,
classify data, or import Zone 2 source.

A result containing `zone2_app` may never enter the legacy raw-result branch.
If its App envelope is valid but its Model Observation is absent, malformed, or
over the bound, Zone 1 renders the App and ends the model loop with a fixed safe
acknowledgement. If the App envelope is invalid, the interaction fails closed;
raw structured content is never rendered or substituted into model history.

The model's already-local assistant tool-call is retained as the structural
partner of the fixed fallback tool turn, so future model history remains a
valid assistant → tool sequence. It contains no App presentation, app-session
reference, governed result or rejected observation. The fallback tool and
assistant content themselves are the fixed acknowledgement.

The App Presentation is response-scoped. It is not stored in LangGraph state,
conversation turns, model requests, checkpoints, generic event payloads, or
generic assistant text. The opaque App session reference may be retained only
in Zone 1's App-instance lifecycle state.

## Consequences

- Zone 2 retains ownership of policy, field limiting, model projection, App
  projection, connector execution, and audit.
- Zone 1 gains a small, deep anti-corruption mapper whose callers receive typed
  projections rather than a raw governed result bag.
- The initial desktop HTTP wire receives safe response text plus an App tree,
  local App-instance ID and presentation revision. The Zone 2 App-session
  reference remains private App-instance lifecycle state rather than a desktop
  field.
- Existing non-App semantic capability completions retain an explicit local
  model-disclosure contract. The obsolete direct backend/App invocation route is
  removed by PP-2 rather than retained as a compatibility path.
- This ADR authorises no Zone 3 provider, prompt, stream, or data-flow change.
