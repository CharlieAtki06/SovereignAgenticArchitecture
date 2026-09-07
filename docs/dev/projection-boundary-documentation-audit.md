# Projection-boundary documentation audit

**Audit date:** 2026-09-07  
**Scope:** 178 project-authored Markdown documents inventoried across the root
cross-zone repository (24), Zone 1 (61), and Zone 2 (93), excluding generated
dependency/cache/graph output. All received a boundary-terminology drift scan;
the current architecture, flow, App, capability-authoring, profile and status
guides listed below received a focused content review. Historical plans/ADRs
received explicit supersession notices where obsolete wire shapes remained.  
**Trigger:** close the remaining PP-4R transport and private-row contract gaps

## Result

The current documentation now describes the implemented boundary consistently:

```text
App-enabled semantic completion
  content             = one bounded Model Observation
  structured_content  = status + request_id + zone2_app only
  _meta               = opaque App lifecycle values only

Governed Outcome + Projection-Private Fields
  remain in Zone 2
```

The canonical developer guide is
[Data boundary and projection contract](../data-boundary-and-projection-contract.md).
Root ADR-0008 records the decision. Historical ADRs retain their original
reasoning but now carry visible amendment/supersession notes.

## Gaps found and resolved

| Gap | Risk | Resolution |
|---|---|---|
| Root connector contract said Zone 1 discarded `structured_content.result` | Private data still crossed the boundary | Changed producer contract to omit it and consumer contract to reject extra keys |
| Root Apps reference showed `{result, provenance, zone2_app}` | Developers could copy the obsolete envelope | Replaced with exact three-key App envelope and updated sequence diagrams |
| Zone 2 ADR-0025 was still marked fully accepted | Historical placement looked normative | Marked superseded in part by cross-zone ADR-0008 with a prominent current-wire note |
| Zone 2 Apps guide described App overlays as additive to the governed envelope | Conflated internal outcome with transport projection | Rewrote around explicit audience projections and server-only private fields |
| `appointment_source_reference` was a public row field | Public schema could advertise a server routing identifier | Added typed private list-row output scope and migrated NHS appointment, record and document references |
| Internal detail targets still declared navigation state as public top-level output | Their internal exposure reduced immediate risk, but the type model contradicted the containment rule | Moved NHS return/Subject/view state and Northstar queue/view state to the existing private top-level schema; visible detail fields remain public |
| Role-based row limiting would also remove the new private binding fields | Authorised Apps with role policies could fail projection or lose paging state | Zone 1 role obligations preserve declared private fields inside Zone 2; Zone 3 allowlists never do |
| Zone 2 glossary had one ambiguous “Internal Output Field” term | Did not distinguish top-level and row scopes or guarantee transport absence | Replaced with “Projection-Private Field” and explicit containment rules |
| Zone 2 module authoring guidance said connectors return a full record | Encouraged undeclared data and relied on later stripping | Requires the declared maximum output contract and explains all three output scopes |
| Shared obligation helpers lived under request management | Policy governance and reasoning mediation had to import another bounded context | Moved pure construction/application functions to `zone2.contracts.obligations`; all 11 import-architecture contracts now pass |
| Zone 1 docs described isolation mainly as a checkpoint/model concern | Missed the stronger physical transport boundary | Added exact-key rejection and “never received” language to host, flow, architecture and implementation docs |
| Root/Zone 1 agent guidance referenced a Flutter shell or omitted the result contract | Onboarding guidance had drifted from the Tauri/Prefab implementation | Corrected shell terminology and added the projection-only invariant |
| Zone 2 ADR index omitted ADRs 0021–0026 | Decisions were hard to discover | Restored index entries and current statuses |

## Documents reviewed

### Root, normative/current

- `README.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `contracts/connector-design.md`
- `docs/data-boundary-and-projection-contract.md`
- `docs/fastmcp-apps-and-prefab-overlay.md`
- `docs/dev/governed-apps-reference-examples-development-plan.md`
- cross-zone ADR index and ADRs 0006–0008

### Zone 1, normative/current

- `AGENTS.md`
- `docs/architecture.md`
- `docs/flows.md`
- `docs/mcp-apps-host.md`
- `docs/dev/confirmation-and-overlay-integration.md`
- `docs/dev/implementation-status.md`
- renderer/App lifecycle ADRs 0028, 0029 and 0033

### Zone 2, normative/current

- `AGENTS.md`
- `CONTEXT.md`
- `docs/modules.md`
- `docs/flows.md`
- `docs/fastmcp-apps.md`
- `docs/implementation-status.md`
- `docs/nhs-record-workspace.md`
- `docs/nhs-appointment-workflow.md`
- ADR index and ADRs 0010, 0011, 0023, 0025, 0026 and 0027

Long-form phase plans and source architecture plans were treated as historical
design records. Where their envelope decisions could be mistaken for the
current contract, the governing ADR now contains an explicit supersession note.
They were not rewritten wholesale because doing so would erase decision history.

## Regression evidence required

The documentation is backed by named executable checks:

- Zone 2 `test_capability_result_contract.py` proves private row fields are
  typed, list-only, disjoint from public row fields, and absent from published
  MCP output schemas.
- Zone 2 `test_mcp_projection.py` proves initial App completions contain exactly
  the projection envelope and that complete-response serialization contains no
  private appointment source reference, cursor, or Subject reference.
- Zone 2 `test_nhs_appointment_overlay.py` proves the appointment source
  reference uses the private row scope.
- Zone 2 import architecture proves request management, policy governance and
  reasoning mediation depend inward on `zone2.contracts`, never on one another.
- Zone 1 `test_mcp_mapping.py` and `test_gateway_overlay_extraction.py` prove a
  governed `result` sibling fails closed without echoing its canary.

Architecture and release tests remain responsible for proving that Zone 1
imports no Zone 2/Zone 3 source and that the same contract holds across a real
synthetic MCP endpoint.

### Verification recorded during this audit

- Zone 2 contract/policy tests: **49 passed**.
- Zone 2 focused MCP projection/NHS App and connector tests: **44 passed** using the
  compatible installed FastMCP/Prefab environment already present in Zone 1
  plus Zone 2's installed dependencies.
- Zone 2 Northstar/private-schema regressions: **35 passed** in the same
  compatible environment.
- Zone 2 import architecture: **11 contracts kept, 0 broken**.
- Zone 1 MCP mapper/gateway tests: **37 passed**.
- Zone 1 import architecture: **6 contracts kept, 0 broken**.
- Focused Ruff and Zone 1 MyPy checks passed.
- A fresh canonical Zone 2 application environment still requires dependency
  synchronization. The local Zone 2 virtualenv lacks FastMCP/Prefab and the
  locked download was blocked by DNS; this must not be confused with the
  successful compatible-environment test above or with a full `make quality`
  run. `make install` now includes the `mcp` extra needed by these tests;
  `make install-all` is reserved for every optional integration, including the
  currently disabled Zone 3 adapters.

## Future audit rule

Any change to `ToolResult`, capability output scopes, App sessions, App actions,
or Zone 3 mediation must update, in the same delivery:

1. the owning zone's typed contract and tests;
2. the consuming zone's anti-corruption tests;
3. the cross-zone ADR when the decision changes;
4. the canonical data-boundary guide and affected zone-local operating docs.

An implementation plan is not a substitute for these current-state documents.
