# Cross-zone connector design contract

**Scope:** Zone 2 capability connectors that return data consumed by Zone 1's ReAct loop.  
**Audience:** Zone 2 connector authors, Zone 1 runtime maintainers.

---

## App-enabled projection firewall (PP-1)

An App-enabled connector returns two independent, governed projections. They have
different consumers and must never be reconstructed from one another.

| Zone 2 output | Consumer | PP-1 rule |
|---|---|---|
| Exactly one FastMCP `ToolResult.content` text block | Zone 1 model history | `ModelObservation`: non-empty and at most 1,024 Unicode code points. |
| `structured_content.zone2_app` plus the opaque app-session reference | The authorised local App renderer | `AppPresentation`: opaque renderer data; it is not model context. |
| `structured_content.result` and other governed fields | Neither Zone 1 model history nor generic App host state | Discarded by Zone 1 after it maps an App-enabled completion. |

Zone 2 owns policy, response limiting, projector content, App structure and audit.
Zone 1 is an anti-corruption mapper and generic local host: it does not inspect
domain fields, create a projection, reproduce policy, or import Zone 2 source.

Zone 1 validates the two projections independently. If the App envelope is
invalid, Zone 1 fails the interaction closed and renders no raw structured
data. If the App is valid but its model observation is missing,
multiple, malformed or oversized, Zone 1 retains the App, performs no second
model inference, persists only fixed safe turns, and returns exactly:

> The governed result is available in the secure workspace.

The preceding assistant tool-call is retained solely as the protocol partner
for the fixed fallback tool turn. It is model-generated local control data, not
a governed/App projection, and the test suite proves it contains none of the
rich-result canaries.

The App tree and opaque session reference are response-scoped. They must not
enter LangGraph state, session turns, checkpoints, generic event payloads or
model prompts. Log only the capability ID, observation failure category and
length; never the observation text or governed/App payload.

This is the PP-1 contract defined by
[ADR 0006](../docs/adr/0006-model-observation-and-app-presentation-are-independent-projections.md).
A completion containing `zone2_app` must never take a generic raw-result
branch. The old direct backend/App route is removed; non-App semantic
capabilities have their own explicitly bounded model-disclosure contract.

---

## Host-only App actions (PP-2)

An App action is a human interaction with an already authorised mounted App. It
is not a semantic capability and it is never a local-model tool. The two MCP
mounts therefore have distinct audiences:

| Zone 2 mount | Consumer | Published tools |
|---|---|---|
| `/mcp` | Zone 1 local-model orchestration | Semantic capabilities only |
| `/mcp/app-actions` | Trusted Zone 1 App host | Only `apps.execute_action` |

The mounted iframe can request only the fixed tool name with an opaque
`action_handle` and a declared `input` object. The host, not the iframe, adds
the active Zone 2 App-session reference, the current presentation revision and
a newly minted Zone 1 action ID. It validates that the named
handle belongs to the active local App instance before contacting Zone 2.

Zone 2 holds the action grant server-side. It binds the grant to the principal,
organisation, entry capability, query fingerprint, subject scope, expiry and
revision, and maps it to a normal governed request. The iframe never receives
or chooses a capability ID, backend cursor, subject identifier, source handle,
session token or idempotency key.

A successful action returns exactly a typed whole-tree replacement:

```json
{
  "kind": "app.update.replace.v1",
  "presentation_revision": 1,
  "zone2_app": { "...": "post-obligation Prefab tree" }
}
```

Its FastMCP `content` is explicitly empty. Zone 1 keeps any successor session
reference and the complete current handle manifest in the private App-instance
lifecycle. A rendered Prefab tree necessarily contains the one opaque handle
for each visible control, but no separate handle manifest or Zone 2 session
reference reaches the desktop wire. Zone 1 adds no conversation or model turn.
Rejections and failures are closed, stable codes; they never fall back to raw
governed JSON or `response_text`.

There is no direct iframe-to-capability route. `apps.execute_action` is the
only interactive App protocol. See
[ADR 0007](../docs/adr/0007-host-only-governed-app-actions.md).

---

## Non-App semantic result guidance

Zone 1 runs a local model with a **context window of 4096–8192 tokens**. The
following raw-result guidance applies only to a model-selected non-App semantic
capability. It must never be used for a completion that contains `zone2_app`.

**Rule: connectors must not return unbounded collections.**

A connector must design its response payload so that the full JSON of a typical result, when
added to a conversation history with 2–3 prior tool exchanges, fits within the Zone 1
context window (conservatively: ≤ 2000 tokens, roughly ≤ 8000 characters). This is achievable
for all governed capability domains (patient records, appointment lists, lab results) with the
design principles below.

---

## Response design principles

### 1. Return only task-relevant fields

A tool that lists appointments should return the fields a clinician needs to understand each
item (date, time, specialty, status) — not the full database row (internal IDs, audit columns,
timestamps Zone 1 cannot interpret). Zone 2's `ResponseLimitingMiddleware` and field-mapping
layer are the right place to enforce this, not Zone 1 clamping.

**Target:** 2–5 fields per item, no nested objects deeper than one level.

### 2. Support `limit` and `cursor` for any list-returning tool

Any tool that queries a data source capable of returning more items than fit in ~350 tokens
(roughly 10 compact list items) **must** expose:

```json
{
  "limit":  { "type": "integer", "description": "Maximum items to return. Default 5, max 20." },
  "cursor": { "type": "string",  "description": "Pagination cursor from a previous response. Omit for the first page." }
}
```

And the response must include:
```json
{
  "items":       [...],
  "next_cursor": "...",   // null if no further items
  "total_count": 42       // optional; helps the model reason about completeness
}
```

For a deliberately model-visible semantic list capability, the model may ask
for a specific page. A mounted App uses a different path: the cursor remains
server-side in the Zone 2 action grant/successor grant, while the renderer sees
only an opaque action handle. Zone 1 never implements or calls
`get_next_page(cursor)` on behalf of an App control.

### 3. Avoid nesting beyond one level

Deep nesting compounds token cost multiplicatively. A connector returning patient demographics
nested inside an appointment nested inside an encounter nested inside a visit is unlikely to
fit more than 1–2 items in a single context window.

If the domain model is deeply nested, project a flat view for the model-facing representation
and expose the raw structure only through a detail-fetch tool that the model can call when it
needs a specific nested field.

### 4. Return `null` fields explicitly, not absent fields

When a field may or may not have a value, return `null` rather than omitting the key. This
makes the schema stable for Zone 1's JSON validation and avoids the model reasoning about
missing-key vs null-value differently.

### 5. Error responses are compact

A connector error response (zone2 `status: "failed"`) should carry only:
- `status` discriminator
- `error_code` (Zone 2's stable code)
- `reason_codes` (opaque list, zero or more)

No stack traces, no database error messages, no sensitive internal state.

---

## Zone 1's non-App defensive safety net

For a model-selected non-App semantic capability only, Zone 1 applies a
`result_char_budget` (default 8000 characters) as a last-resort cap on raw JSON
before it is appended to history. This cap:

- Is **not** a compression strategy.
- Truncates raw JSON at the byte boundary — the model receives potentially malformed JSON.
- **If it fires in production, fix the connector** — do not raise the budget.

The cap exists to prevent a catastrophic runaway connector from crashing the ReAct loop
entirely. Connectors that return within budget never see it.

---

## Sizing reference

| Scenario | Approx chars | Approx tokens |
|---|---|---|
| Single appointment (4 fields, compact) | ~150 | ~38 |
| List of 5 appointments | ~750 | ~187 |
| List of 10 appointments | ~1500 | ~375 |
| Single patient summary (8 fields) | ~300 | ~75 |
| Full conversation (12 turns + 2 tool results) | ~4000 | ~1000 |
| Zone 1 context window (typical small model) | — | ~4096 |

A list of 10 compact appointments leaves ~2700 tokens for system prompt, query, and model
response — viable. A list of 100 items would leave essentially nothing.

---

## Verification

Zone 2's integration test suite must assert that every App-enabled projection
returns its rich governed/App data separately from one non-empty, at-most-1,024
code-point observation. Tests should use canaries in the rich result (for
example an identifier, cursor, opaque source handle and long excerpt) and prove
that only the approved compact observation reaches the next Zone 1 inference.

The non-App semantic integration test should continue to assert that a typical
default list serialises to fewer than 8000 characters. A real synthetic Zone 2
endpoint must be used for the cross-zone MCP contract test; do not share Zone 2
internal test helpers with Zone 1.

For an App action, assert a separate closed contract: the FastMCP result has
empty `content`; `structured_content` is exactly a replace/rejected/failed
App-action shape; only a replacement has a Prefab tree; the raw post-obligation
action result never appears in content, metadata, a model request, or the
desktop action response. A paging fixture must prove that successor cursor
binding changes only in a Zone 2 grant, never in the renderer or Zone 1 wire.
