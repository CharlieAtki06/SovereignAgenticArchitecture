# ADR-0004: Native MCP elicitation replaces the hand-rolled confirmation protocol and the governed-capability discriminator

Status: Accepted

## Context

Two pieces of bespoke machinery sat on the Zone 1 ⇄ Zone 2 boundary:

1. **A hand-rolled two-phase confirmation protocol.** A governed capability returned
   `status=awaiting_confirmation` + a `confirmation_id`, and Zone 1 called a separate
   `zone2_confirm` MCP tool to resolve it.
2. **A custom `_meta` marker (`zone2.governed: true`)** on every capability tool, which existed
   *only* so Zone 1 could filter the `zone2_confirm` meta-tool out of capability discovery.

The Model Context Protocol now provides a first-class primitive for exactly (1): **elicitation**.
On the sessionless `2026-07-28` protocol this is the *guard pattern* — a tool returns an
`InputRequiredResult` describing the input it needs; the client fulfils it and re-invokes the same
tool with the answer attached. Each round is a discrete, independently-authenticated, stateless
request. Adopting it removes the reason (2) exists: with no meta-tool, every tool Zone 2 lists is a
governed capability, so Zone 1 needs no discriminator.

Investigation (`scratchpad/fastmcp-governed-discriminator-analysis.md`) confirmed the `_meta` marker
was the *correct* mechanism given a sibling meta-tool (FastMCP tags are server-internal and never
cross the wire; a name convention would couple the zones) — but the cleaner design removes the need
for a discriminator rather than perfecting it.

## Decision

- **Confirmation is native MCP elicitation.** Zone 2's capability handler returns `InputRequiredResult`
  when a governed request suspends on a confirmation challenge; the client drives the round-trip and
  re-invokes with the decision. The `zone2_confirm` tool is removed.
- **Edge-surface-is-capabilities-only invariant.** The MCP surface Zone 1 connects to exposes *only*
  governed capabilities. The `zone2.governed` `_meta` marker and Zone 1's discriminator are removed.
  Any future non-capability/control tool must be exposed on a **separate MCP mount** Zone 1 never
  connects to — never mixed into the edge surface. This keeps the discriminator from silently
  returning.
- **Both zones run on FastMCP v4** (`fastmcp==4.0.0b1`) targeting the `2026-07-28` spec. Zone 1 moves
  from the raw `mcp` SDK to `fastmcp.Client` — symmetric with Zone 2's FastMCP server and giving
  native elicitation-loop handling and typed tools/`meta`. `fastmcp.Client` is a generic client
  library, not Zone 2 source, so it does not breach the boundary rule.

### Beta-dependency risk (accepted)

FastMCP v4 is `4.0.0b1` (beta) on the `2026-07-28` spec (a release candidate). The underlying `mcp`
Python SDK resolved to **stable `2.0.0`**; only `fastmcp` (and transitively `pydantic`) are
pre-release. This is a deliberate bet on pre-release code across the audit boundary, mitigated by:
a throwaway spike gate that validated the guard pattern, identity-per-round, and the async→sync
bridge against the installed beta before any production edit; exact-version pins with
`[tool.uv] prerelease = "allow"`; and a staged rollout (dependency bump proven green before the
behavioural change). Pins move beta→stable when the spec + fastmcp v4 reach GA, with no design change.

## Consequences

- Purpose remains identity-derived (ADR root/zone context unchanged); it is never on the wire.
- Confirmation is a stateless round-trip; the sealed `request_state` carrying correlation is a
  stronger integrity guarantee than the previous bare `confirmation_id`.
- A user **decline** is now a distinct, audited governance outcome (see Zone 2 ADR-0018), not
  conflated with a timeout expiry.
- Coordination followed CLAUDE.md: Zone 2 (server) changes precede Zone 1 (client).
- Superseded/amended: this replaces the confirm-tool + `_meta` design across
  Zone 2 ADR-0013 and Zone 1 ADR-0013 (see each zone's ADR-0018 / ADR-0017).
