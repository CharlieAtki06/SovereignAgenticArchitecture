# Cross-zone connector design contract

**Scope:** Zone 2 capability connectors that return data consumed by Zone 1's ReAct loop.  
**Audience:** Zone 2 connector authors, Zone 1 runtime maintainers.

---

## The bounded response invariant

Zone 1 runs a local model with a **context window of 4096–8192 tokens**. Every tool result
returned by a Zone 2 connector is appended to the model's conversation history as a `tool`
turn. A connector returning an unbounded collection can fill the context window in a single
invocation — the model then has no room to reason, respond, or call another tool.

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

The model can then request a specific page ("show me the next 5 appointments") or the Zone 1
runtime's FastMCP Apps layer can paginate silently via `get_next_page(cursor)`.

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

## Zone 1's defensive safety net

Zone 1 applies a `result_char_budget` (default 8000 characters) as a last-resort cap on the
raw JSON of a tool result before it is appended to history. This cap:

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

Zone 2's integration test suite should include a test asserting that each list-returning
capability's typical response (with default `limit`) serialises to fewer than 8000 characters.
This test is cheapest to write and catches regressions before Zone 1 ever sees the data.
