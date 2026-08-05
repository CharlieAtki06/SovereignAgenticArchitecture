# ADR 0003 — The MCP tool-result is the typed Zone 1 ↔ Zone 2 contract

**Status:** Accepted

**Builds on:** [ADR 0002](0002-mcp-as-zone-boundary-transport.md) (MCP as the transport boundary)

## Context

[ADR 0002](0002-mcp-as-zone-boundary-transport.md) fixed MCP as the only interface between the zones and forbade Zone 1 from importing Zone 2. That leaves an open question: **how is the *shape* of a `tools/call` result agreed between the zones**, given they cannot share Python types?

Historically the result was strongly typed on Zone 2's side (a Pydantic discriminated union, `McpToolResult`) but **dict-fished on Zone 1's side** — `payload.get("status")`, `payload.get("reason_codes") or ()`, a hand-rolled timestamp parser. Ingress was untyped and silently coercive (e.g. a `reason_codes` sent as a string would iterate into characters), and a timestamp weakness (`expires_at: str`) forced Zone 1 to coerce naive values.

## Decision

The MCP tool-result is a **strongly-typed contract, modelled at each zone's own edge, bridged by an explicit mapper** — there is no shared type.

- **Zone 2 (server) owns the contract.** It emits a Pydantic discriminated union (`McpToolResult`), strict-out (`extra="forbid"`), with timestamps typed `AwareDatetime` (timezone-aware RFC 3339, serialised by Pydantic — not hand-rolled).
- **Zone 1 (client) mirrors it as anti-corruption.** `infrastructure.mcp.wire.Zone2ToolResult` is Zone 1's own Pydantic model of the same wire shape. It is **liberal-in** (`extra="ignore"`): additive Zone 2 fields never break Zone 1, but a field Zone 1 *uses* being removed/renamed/retyped fails loud as a `ValidationError`. Zone 1 validates the inbound payload into this model, then maps it to its domain outcome via an explicit, exhaustively-checked mapper.
- **Timestamps are aware end to end.** `expires_at` is a required `AwareDatetime` on both edges, enforcing "confirmations must expire" at the type level (a missing/naive value fails at construction/validation, not silently).

Because the zones are separate repos with no shared package, **Zone 1's mirror is kept honest not by shared code but by the real-Zone-2 integration run** (Phase 3 completion, `make up-nhs`): with typed ingress, real drift surfaces there as a clean `ValidationError` rather than silent corruption. A committed schema / vendored-copy / cross-repo drift CI was considered and **deliberately not built** — the strong typing already de-fangs additive drift, the contract is small (six statuses), and that machinery is drift *documentation*, not typing. Revisit if the contract begins changing often (or when a shared contracts package/submodule exists).

## Consequences

- The inter-zone interface is strongly typed on both sides; malformed Zone 2 output fails loud and located, never silently corrupts a Zone 1 outcome.
- Zone 2 can add result fields without breaking Zone 1 (liberal-in); it cannot remove/retype a consumed field without a loud failure.
- The two typed models are a hand-maintained mirror across repos — an accepted, bounded cost, guarded by the real-Zone-2 integration run rather than shared code.
- **Recommended next step:** version the inter-zone result contract (a `schema_version` on `McpToolResult`) so an unsupported version fails explicitly — a coordinated wire change, deferred here.
