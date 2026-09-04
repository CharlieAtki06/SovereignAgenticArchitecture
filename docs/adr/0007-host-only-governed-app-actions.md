# ADR-0007: Host-only governed App actions use a separate MCP surface

## Status

Accepted.

## Context

An App-enabled semantic capability is selected by the Zone 1 local model and
returns a governed App Presentation. Once mounted, a human must be able to
paginate or inspect a permitted item without turning the App into model context
or exposing raw backend capability IDs to the renderer. An App-specific
renderer confirmation protocol is not part of this phase; native MCP
confirmation remains a trusted-host concern.

The previous direct-App route let an iframe name a backend capability and supply
arbitrary arguments. It is not an adequate interface for governed human
interaction and is removed with this decision; the proof environment has no
consumers that require a compatibility bridge.

## Decision

Zone 2 exposes two MCP surfaces:

| Surface | Consumer | Contents |
|---|---|---|
| `/mcp` | Zone 1 model orchestration | Model-visible semantic capabilities only. |
| `/mcp/app-actions` | Trusted Zone 1 App host | Exactly one FastMCP UI-only tool: `apps.execute_action`. |

`apps.execute_action` is registered using FastMCP `@app.tool(model=False)`.
The visibility declaration is an audience signal, not authorisation. Zone 1
must never discover this mount for its model catalogue, and Zone 2 validates
every action independently.

The mounted Prefab App may call only the fixed tool with an opaque action handle
and a declared JSON input object. Zone 1 attaches the active App-session
reference, revision, and host-minted action ID. The iframe never receives or
selects a session ID, cursor, subject ID, capability ID, source handle, or
idempotency key.

Zone 2 resolves the handle through a private, session-scoped action-grant
record. It persists the handle digest, not the raw handle, and binds the grant
to identity, organisation, entry capability, query/scope fingerprints, expiry
and presentation revision. A valid action enters the normal `GovernedRequest`
lifecycle, including identity, deterministic policy, obligations, confirmation,
execution and audit. An App-action session is delivery state, not a second
business-domain aggregate.

The plugin-owned `AppActionResultProjector` receives only the completed,
post-obligation `GovernedOutcome` and constructs the successor Prefab tree.
Its governed result is never mapped to MCP action `content`, a model
observation, or a raw result field. Cursor/continuation bindings for a
successor page are derived inside the catalogue-owned successor-grant
transition and never enter Zone 1.

The first successful App-action response is a typed whole-tree
`app.update.replace.v1` update. It has explicit empty FastMCP content and carries
only the structured Prefab tree plus successor opaque lifecycle metadata. It has
no model observation, raw governed result, generic response text, or JSON
fallback. Zone 1 applies the replacement only to the active in-memory App
instance and never to model history, LangGraph state, checkpoints or generic
conversation-result messages. The dedicated App-action wire carries only the
local App instance ID, revision, tree, or stable safe error code.

## Consequences

- A new Zone 2 App action changes only Zone 2 action declarations/projectors;
  it does not add a model tool, a Zone 1 domain branch, or a desktop renderer
  branch.
- The generic host action interface is small and stable while Zone 2 hides
  action target selection, continuation data, policy re-entry, session rotation,
  receipts and audit behind it.
- FastMCP's normal same-provider function-reference pattern is deliberately not
  used for the action call because the action surface is separately mounted.
  `apps.execute_action` is a fixed, versioned protocol name and has an explicit
  serialization compatibility test.
- The iframe does not receive a public App-session reference, full grant
  manifest, target capability, cursor or public action/correlation ID. The
  deployed sandbox posture is documented separately; action security does not
  rely on claiming an opaque iframe origin.
- Rolling back to a previously safe App consumer leaves any supported App
  surface read-only; it never restores raw governed JSON or arbitrary
  iframe-to-capability invocation.
