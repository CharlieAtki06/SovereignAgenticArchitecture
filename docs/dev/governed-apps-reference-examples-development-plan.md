# Governed Apps Reference Examples — Multi-Phase Development Plan

> **Status:** Proposed implementation baseline
>
> **Date:** 2026-09-04
>
> **Scope:** Zone 1 edge runtime, Zone 2 governed mediation, desktop App host, reference examples, and client branding
>
> **Audience:** Zone 1 runtime/desktop engineers, Zone 2 governance/module engineers, QA and security reviewers
>
> **Zone 3 posture:** Deliberately deferred as an architecture decision track; it is not an implementation phase in this plan.
>
> **Does not authorise:** Zone 3 implementation, PHI/PII egress, live clinical/operational data, or tenant product deployment.
> **Data posture:** Both reference examples remain synthetic. They are proof integrations, not customer deployments or product commitments.

## 1. Purpose

This plan turns the current FastMCP Apps/Prefab work into a convincing proof of the
three-zone architecture. It does not aim to make the edge model a larger chat
experience. It aims to prove a stricter and more useful division of labour:

- Zone 1's local model identifies intent, chooses a small number of semantic
  capabilities, and explains a governed outcome in short form.
- Zone 2 decides what is allowed, audits every request and action, owns domain
  vocabulary, builds the structured App result, and keeps interaction policy out
  of the model.
- The human navigates long lists, record detail, pagination, previews and
  confirmations through an App without adding those data to the model's
  conversation history.

The two examples prove the same generic mechanism in different domains:

| Reference example | What it proves |
|---|---|
| **NHS Care** | A clinician can inspect a synthetic patient-record workspace with many documents while the local model receives a minimal observation rather than a record dump. |
| **Northstar Infrastructure Operations** | An operator can move from a broad, all-authorised-areas shift brief into a long synthetic work queue, page, inspect detail, and complete an audited crew assignment. |

Neither reference example represents an identified user, a tenant, a customer
deployment, or a claim that the system is ready for live clinical/operational use.

## 2. Desired end state

```text
User
  │
  ▼
Zone 1 local model ── semantic entry request ──► Zone 2
  ▲                                             │
  │                                             ├── compact Model Observation
  │                                             │
  │                                             └── rich governed App tree
  │                                                      │
  │                                                      ▼
  └──────── short explanation                  Zone 1 generic App host ──► Human
                                                         │
                                                         └── page / preview / detail / confirm
                                                              direct governed App action ──► Zone 2
                                                              (no model turn)
```

The end state is complete only when the following statements are demonstrably
true, not merely described in documentation:

1. A rich App result can contain permitted structured data without that data
   appearing in a subsequent local-model prompt or persisted model history.
2. Page, preview and row actions create no local-model turn.
3. An App action cannot escape its original principal, organisation, subject
   scope, entry query, action allow-list or expiry.
4. The same generic App host and interaction interfaces support both reference
   examples without Zone 1 gaining NHS- or Northstar-specific rendering logic.
5. Brand choice changes host-owned presentation only; it never changes what a
   caller can access or what a Zone 2 App may disclose.
6. Zone 3 is not enabled for NHS data while its architecture remains undecided.

## 3. Scope and deliberate exclusions

### In scope

- Correcting the Zone 1/Zone 2 dual-projection transport.
- A generic, model-bypassing App-action interface for paging, detail and preview.
- Reusable paginated-list and record/document-view factories in Zone 2.
- A synthetic NHS clinical-record workspace and a richer synthetic Northstar work
  queue as reference examples.
- Prompt/discovery hardening for the all-authorised-areas shift brief.
- Explicit, bounded local-model context promotion after the document workspace is
  safe and tested.
- A safe `BrandManifest` v2 and the documentation/test work required to make it
  maintainable.
- Regression coverage across Zone 1, Zone 2, desktop renderer and cross-zone MCP
  contracts.

### Explicitly excluded

- Live NHS, operational, patient, telemetry, location or customer data.
- A domain-specific screen implemented in Zone 1.
- A generic “send selected App text to the model” feature.
- A new cloud/Zone 3 reasoning capability, token streaming, or changes that make
  NHS capabilities available to Zone 3.
- Dynamic, remote or tenant-selected branding before signature verification and
  host policy are designed.
- Replacing Zone 2's deterministic governance path with a model-driven path.

## 4. Working vocabulary and ownership

The terms below are proposed planning vocabulary. PP-0 must reconcile them
with each repository's `CONTEXT.md` before code uses them as public names.

| Term | Meaning | Owner |
|---|---|---|
| **Reference example** | A synthetic integration used to prove reusable architecture behaviour. It is not a customer/tenant. | Root docs and demo orchestration |
| **Semantic entry capability** | A model-visible Zone 2 capability that opens a governed workflow or returns a compact business answer. | Zone 2 plugin and policy |
| **Model Observation** | The exact compact, Zone 2-produced text that may be appended to the local model's conversation history. | Zone 2 projection; Zone 1 transports it verbatim |
| **App payload** | The post-obligation structured App tree and display data intended for a human. It is not model context. | Zone 2 App package |
| **App action** | A human-initiated interaction with a mounted App, such as next page, preview or row detail. It is not a model tool call. | Zone 2 governs; Zone 1 host relays |
| **App Action Handle** | An opaque, session-bound identifier for one declared App action. It is not a capability ID, cursor, URL or subject ID. | Zone 2 |
| **App Update** | The typed response to an App action. The first version replaces the current App tree atomically. | Zone 2 produces; Zone 1 renders |
| **Context promotion** | A separate governed operation that produces a deliberately small Model Observation from a selected, permitted App item. | Zone 2 |

### Separation of concerns

| Concern | Zone 1 owns | Zone 2 owns | Must never happen |
|---|---|---|---|
| Intent and conversation | Local model orchestration, turn history, compact observation insertion | Capability descriptions and compact model projection | Zone 1 re-projecting data or inferring policy locally |
| Policy and disclosure | None beyond local host gating | Identity, purpose, subject scope, obligations, action authorisation, audit | Policy in an iframe, frontend or connector |
| Domain data and terminology | None | Capability definitions, connectors, projectors, columns, labels, document metadata | NHS/Northstar renderer branches in Zone 1 |
| App interaction | Generic mounted-instance lifecycle and protocol relay | Action definitions, session binding, revalidation, resulting App Update | Exposing raw backend capability IDs/cursors to the model |
| Presentation/branding | Generic renderer, design tokens, accessibility, local asset loading | Structural Prefab tree only | Brand changing fields, roles, purposes or capability access |
| Zone 3 | No direct client or connector | Future governed egress decision only | Zone 1 transcript or patient App data sent to Zone 3 |

### Bounded-context and module guidance

Existing bounded contexts remain authoritative. This work must deepen modules at
their current seams rather than create cross-cutting shortcuts.

- **Zone 1 `capability_access`** owns mapping the published MCP result contract
  into typed local outcomes. It is the seam where `Model Observation`, App payload
  and app-session metadata are separated.
- **Zone 1 `interaction_runtime` and `model_execution`** own model history and
  inference. They accept only `Model Observation`, never an App payload or raw
  governed result as a tool turn.
- **Zone 1 `app_hosting` / desktop host** owns one generic mounted App instance,
  protocol validation and rendering. It has no domain action code.
- **Zone 2 `request_management`, `policy_governance`, `capability_execution` and
  `provenance_audit`** remain the authority for every governed request. App actions
  must reach those existing seams; they must not call plugin connectors directly.
- **Zone 2 `apps`** owns App definitions, factories and compact/rich projections.
  In the first implementation it is a deep presentation module using existing
  contracts, not a new domain aggregate or a bypass around `GovernedRequest`.
- **Zone 2 plugins** own only reference-example capabilities, fixtures and
  domain-specific projection declarations. They continue to import only contracts
  and the shared kernel.

When two or more adapters genuinely need to vary, add a narrow contract in the
appropriate repository's `contracts/` package. Do not make one zone import the
other's source to avoid writing a contract.

## 5. Baseline facts to preserve and correct

The plan starts from an evidence-backed baseline, so an implementation does not
follow older documents when they disagree with the running code.

| Area | Current implementation fact | Planning consequence |
|---|---|---|
| Dual projection | Zone 2 creates `ToolResult.content` for the compact model projection and a closed `structured_content` envelope containing only `status`, `request_id` and `zone2_app`. The governed result and projection-private routing fields never enter Zone 1. | ADR-0008 and the strict producer/consumer contract are mandatory regression gates. |
| Direct App calls | The earlier arbitrary direct-capability relay is an unused PoC path. | PP-2 removes it and makes the typed host-only App Action/Update interface the sole interactive App route. |
| Pagination | NHS has a signed-cursor backend capability and app-session metadata, but the generic list has no action nodes. | PP-2 builds one reusable interactive primitive. |
| Northstar prompt | The source prompt already tells the agent not to ask for a district for a broad shift question. | First inspect deployed prompt discovery/cache; do not add a duplicate prompt file. |
| Northstar fixtures | There are only two synthetic work orders. | PP-3 adds a realistic enough long-list proof corpus. |
| NHS documents | No document viewer or synthetic `DocumentReference` corpus is implemented. | PP-4 creates a structured, synthetic-only workspace. |
| Branding | v1 is strict, local and host-controlled, but the manifest is limited and some docs/runtime assumptions have drifted. | PP-5 expands only presentation configuration. |
| Zone 3 | Current work is an incomplete implementation of a much stronger planned design. | Keep it out of this delivery path; add protective regression coverage only. |

The root [`fastmcp-apps-and-prefab-overlay.md`](../fastmcp-apps-and-prefab-overlay.md)
is an architectural reference, but portions of its pagination/update narrative are
ahead of the code. PP-0 and each later phase must keep that document labelled
as **implemented**, **planned**, or **superseded**, rather than presenting an
aspirational flow as delivered behaviour.

## 6. Target interfaces

The interfaces below are intentionally small. They are the external seams; each
implementation may have smaller internal adapters and fakes.

### 6.1 Model-driven capability outcome

At the Zone 1 MCP gateway seam, map a completed governed call into a typed
outcome. For an App-enabled completion, its two independent channels are:

```text
ProjectedAppCompletedOutcome
  model_observation: ModelObservation
  presentation: AppPresentation

AppOnlyCompletedOutcome
  presentation: AppPresentation
  observation_failure: categorical reason + length only

LegacyCompletedOutcome
  raw result: temporary non-App compatibility route only
```

Rules:

- `model_observation` originates only from Zone 2's MCP `ToolResult.content`.
- `presentation` originates only from Zone 2's post-obligation `zone2_app`
  and opaque app-session metadata.
- LangGraph may serialise only `model_observation` into a `ConversationTurn`.
- A raw governed result and projection-private top-level/row data are absent from
  the App-enabled MCP completion. Zone 1 rejects extra structured siblings rather
  than discarding them.
- A valid App with invalid model text becomes `AppOnlyCompletedOutcome`: Zone 1
  renders the App, skips the second inference, and returns the fixed safe
  acknowledgement. A malformed App envelope fails closed.
- If a valid App and Model Observation are already captured but the edge model's
  continuation is empty or malformed, Zone 1 retains the App and returns the
  same fixed acknowledgement. Initial model failures remain failures.
- `LegacyCompletedOutcome` is the temporary, non-App exception only; a result
  containing `zone2_app` must never enter that branch.

This is a contract correction, not a Zone 1 policy engine. Zone 1 transports the
Zone 2 decision; it does not determine which fields are safe for the model.

### 6.2 Direct App Action interface

Introduce one host-only published MCP interaction rather than exposing each
interactive target as a direct capability invocation or model tool.

```text
AppActionInvocation
  app_session_id: AppSessionId              # supplied by the Zone 1 host
  action_handle: AppActionHandle            # supplied by the mounted App
  input: JSON object                        # action-specific, schema-validated

AppActionOutcome
  update: ReplaceApp(AppPayload) | ConfirmationRequired | ActionError
  receipt: optional governed action receipt
  next_app_session_id: optional rotated value
```

The initial `AppUpdate` mode is **replace the entire App tree atomically**. That
is deliberately simpler and deeper than exposing client-specific patches. It gives
the renderer a stable interface and keeps paging state, cursors and row data inside
Zone 2. Incremental patches may be considered only after replacement updates are
measured as inadequate.

Rules:

- The iframe never receives raw backend capability IDs, cursors, subject IDs,
  source URLs or an `app_session_id` it can choose.
- Zone 1 verifies that the mounted local App instance is active and that the
  requested action belongs to it. This is a local host gate, not authorisation.
- Zone 2 resolves `action_handle` to a declared action, validates principal,
  organisation, entry capability, query fingerprint, scope, expiry, allowed action
  and input schema, then runs the normal governed execution path and audit flow.
- Zone 2 may rotate the app session/handle after an action. Zone 1 replaces its
  local metadata only from the governed response.
- Direct App actions never append a local-model turn by default.

### 6.3 Pagination interface

The reusable Zone 2 `PaginatedListFactory` accepts post-obligation data and a
declared action descriptor; it never queries a connector or evaluates policy.

```text
PaginatedListView
  title
  declared_columns
  rows
  page_position
  has_next / has_previous
  next_action_handle / previous_action_handle
  optional row_action_handles
```

Continuation state must be opaque to the App. Zone 2 may use server-side state or
a signed opaque continuation internally, but it must bind it to at least the
principal, organisation, app session, entry query fingerprint, subject scope,
action, expiry and page constraints. A signature alone is not sufficient if the
signed values are not compared on receipt.

### 6.4 Document workspace interface

The first document slice is intentionally structured, not a binary PDF viewer.
It renders synthetic document metadata and permitted sections/excerpts; it does
not expose a path, raw FHIR Binary URL or browser network access.

```text
RecordWorkspace
  summary: document_count, review_count, safe status
  document_list: paginated DocumentCard rows
  document_preview: structured permitted sections for one opaque handle
  provenance: safe source/date/type metadata
```

The semantic entry capability returns a count/status observation. Page and preview
are App actions. Context promotion is separate and has no implicit connection to
what the user happened to view.

## 7. Phase plan

Each phase is independently reviewable and ends in demonstrable behaviour. Do not
begin a later phase merely because the code compiles; complete its exit criteria and
regression suite first.

`PP` means **Proof Profile**. These identifiers deliberately do not reuse the
historical phase numbers in the Zone 1 or Zone 2 implementation plans, whose status
labels cover different scopes and are not all current.

### Delivery ownership, ordering and rollback

| Phase | Primary owners | Preconditions | Merge order and safe rollback |
|---|---|---|---|
| PP-0 | Root documentation owners; Zone 1/Zone 2 maintainers review | None | Root documentation only. Revert the documentation change if it proves inaccurate; do not change runtime behaviour here. |
| PP-1 | Zone 2 projection owner, then Zone 1 capability-access/interaction-runtime owner | PP-0 contract decision and canary fixture | Zone 2 contract/projector tests first, then Zone 1 mapper/history tests, then root docs. Keep a compatibility test for existing non-App results; roll back the Zone 1 consumer only if it can still consume the published Zone 2 result safely. |
| PP-2 | Zone 2 Apps/MCP owner, then Zone 1 app-hosting/runtime owner | PP-1 complete | Zone 2 host-only action interface first; Zone 1 dispatcher/wire second; desktop renderer third. Feature-gate direct actions so rollback returns to a read-only App rather than exposing backend capabilities. |
| PP-3 | Zone 2 Northstar plugin/App owner; Zone 1 desktop owner only for generic regressions | PP-2 complete | Ship fixtures/capabilities/App projectors in Zone 2; prove through existing generic Zone 1 host. Roll back by disabling the synthetic profile/versioned fixture, never by adding a Zone 1 domain branch. |
| PP-4 | Zone 2 NHS plugin/App owner; Zone 1 desktop owner only for generic regressions | PP-3 complete and synthetic-data review | Ship the synthetic document workspace behind the generic action interface. Roll back by disabling the example capability/profile; do not retain a browser document path or binary preview shortcut. |
| PP-5 | Zone 1 branding/desktop owner; root documentation owner | PP-2 renderer contract stable | Add schema/parser support before optional local manifests, then visual tests. Roll back to the last validated bundled manifest; never bypass host validation. |
| PP-6 | Root coordinator plus both zone maintainers | PP-3 through PP-5 complete as applicable | No new interface. Fix or revert incomplete demo/documentation changes until the scripted proof and quality gates are repeatable. |

### PP-0 — Baseline, vocabulary and documentation truth

**Objective:** establish an accurate shared starting point and prevent further
implementation from following stale prose.

#### Work

1. Create a short cross-zone decision record for the two hard-to-reverse interface
   choices:
   - `ToolResult.content` is the sole source of a local `Model Observation`.
   - A generic host-only App Action interface is separate from the local model
     capability catalogue.
2. Update the root Apps reference to distinguish shipped functionality from the
   planned direct-update flow. Do not claim interactive pagination is complete.
3. Update both demo guides to call NHS Care and Northstar **synthetic reference
   examples**, not users, customers or tenants.
4. Verify the running Northstar profile with `prompts/list` and `prompts/get`.
   Record whether the published `agent.context` is present before changing prompt
   wording. Add a runtime regression if discovery/cache is the cause.
5. Reconcile the planning vocabulary in this document with Zone 2's `CONTEXT.md`
   and Zone 1 terminology. Do not rename existing public concepts casually.
6. Add a current-state matrix to each affected status document, including the
   iframe sandbox discrepancy and the direct-action limitations.
7. Restore or remove any dead desktop end-to-end command before calling browser
   coverage a quality gate. Zone 1 currently has local visual coverage, but its
   documented desktop e2e command and CI coverage need reconciliation.

#### Ownership

- Root documentation owns cross-zone terminology and sequence.
- Zone 1 and Zone 2 documentation own implementation-specific status.
- No domain capability or UI feature is added in this phase.

#### Regression and acceptance

- A documentation review confirms every “implemented” claim is backed by a test
  or a file/location reference.
- `prompts/list`/`prompts/get` evidence is captured in the Northstar guide or a
  troubleshooting note.
- The two reference examples remain explicitly synthetic in their README/demo
  introduction and acceptance matrices.

#### Do not do

- Do not add a second agent-context prompt before checking the running profile.
- Do not decide Zone 3 architecture in a documentation cleanup.

### PP-1 — Projection integrity and edge-context containment

**Objective:** make the dual projection real before adding more rich data.

**Implemented contract:** [ADR 0006 — Model observation and App presentation
are independent projections](../adr/0006-model-observation-and-app-presentation-are-independent-projections.md).
The named PP-1 regression suite covers Zone 2 projector separation, the Zone 1
MCP mapper, model-prompt exclusion, App-only fallback, checkpoint separation,
non-App semantic behaviour, desktop isolation and the real-endpoint cross-zone
contract. Do not mark this phase complete until every named gate passes.

Named regression selectors:

- Zone 2: `tests/application/test_mcp_projection.py::test_current_nhs_and_northstar_app_handlers_emit_exactly_one_compact_model_observation` and `::test_handler_with_nhs_overlay_keeps_rich_app_data_out_of_model_observation`.
- Zone 1 mapper: `runtime/tests/unit/test_gateway_overlay_extraction.py::test_app_result_maps_compact_text_and_rich_tree_to_separate_outcome_fields` and `::test_invalid_app_model_text_maps_to_app_only_outcome`.
- Zone 1 orchestration/persistence: `runtime/tests/unit/test_langgraph_orchestrator.py::test_projected_app_result_keeps_presentation_out_of_model_and_checkpoint`, `::test_app_only_result_renders_app_and_skips_second_model_inference`, and `runtime/tests/application/test_handle_interaction_app_instance.py::test_app_presentation_is_not_persisted_on_the_interaction_session`.
- Zone 1 App-action boundary and architecture: `runtime/tests/application/test_dispatch_app_action.py`, `runtime/tests/application/test_app_action_runtime_isolation.py`, `runtime/tests/architecture/test_dependency_rules.py::test_runtime_never_imports_zone_two_or_zone_three_source`, and `runtime/tests/release/test_zone2_mcp_projection_release.py::test_real_synthetic_zone_two_projects_model_observation_and_app_independently`.
- Desktop: `desktop/src/features/conversation/InteractionResultView.test.tsx` and `desktop/src/features/conversation/PrefabOverlayPanel.test.tsx` App-isolation cases.

#### Zone 2 changes

1. Treat `ToolResult.content` as the canonical `Model Observation` for every
   overlay-enabled capability.
2. Require an explicit compact projector for any capability whose rich result can
   be large or contains confidential fields; fail construction/tests if a protected
   overlay has no model projection.
3. Emit a closed App `structured_content` envelope containing only `status`,
   `request_id`, and `zone2_app`; retain governed and Projection-Private data in
   Zone 2 and keep lifecycle values in MCP metadata.
4. Ensure the compact projection itself contains no raw document excerpt, table,
   cursor, patient name, date of birth, direct identifier or arbitrary free text
   unless a capability has an explicit, reviewed exception.

#### Zone 1 changes

1. Map App completions to `ProjectedAppCompletedOutcome` or
   `AppOnlyCompletedOutcome`, carrying `ModelObservation` and
   `AppPresentation` independently; reserve `LegacyCompletedOutcome` for the
   temporary non-App path.
2. Change the LangGraph orchestrator so its next `ConversationTurn(role="tool")`
   is built only from `model_observation`.
3. Keep the App payload out of session turns, checkpoints, generic response text
   and event payloads intended for model/low-trust consumers.
4. Ensure direct App actions cannot mutate the conversation turn list.
5. Audit Zone 1 capability-invocation events: status events must not include raw
   action arguments where they could be rendered or forwarded outside the trusted
   local host.

#### Tests

| Level | Test | Expected invariant |
|---|---|---|
| Zone 2 application | An overlay returns a rich result containing sentinel name, DOB and document excerpt plus a short model projector text. | The MCP result contains the rich App payload and the exact compact text in separate channels. |
| Zone 1 unit/application | Map the same MCP result. | `model_observation` equals Zone 2 content; it is not reconstructed from structured data. |
| Zone 1 orchestration | Spy on the next model inference request after the tool call. | It contains the compact observation and excludes every sentinel raw value. |
| Zone 1 session | Persist/restore a session after an App result. | No App payload or sentinel raw value is in conversation turns/checkpoints. |
| Cross-zone contract | A changed result shape fails a contract fixture, rather than silently falling back to raw structured content. | Contract drift is fail-closed. |
| Regression | A non-App capability still produces the same compact text/confirmation/error behaviour. | Existing simple workflows do not regress. |

#### Exit criteria

- A test proves that the human-facing App may display a permitted sentinel while
  the edge model does not receive it.
- A test proves that an App action produces zero new model turns.
- The root Apps architecture document describes the actual result flow accurately.

### PP-2 — Generic App Actions and paginated App primitive

**Objective:** deliver one reusable, human-driven interaction mechanism rather
than adding a bespoke pagination implementation per reference example.

**Status:** implementation is complete; PP-2 is not yet marked complete. The
cross-zone contract is accepted in
[ADR 0007](../adr/0007-host-only-governed-app-actions.md). Focused Zone 1,
Zone 2 and desktop regressions pass, but the release-level test still needs a
configured real synthetic Zone 2 endpoint and the repositories have unrelated
aggregate-gate/environment blockers recorded with the implementation. PP-2
remains gated on PP-1's named quality exit criteria; no status change to PP-1
is implied by this implementation work.

**Implemented target:** the local model discovers semantic capabilities only on
`/mcp`. A separate host-only Zone 2 mount, `/mcp/app-actions`, publishes the
single UI-only FastMCP tool `apps.execute_action`. The mounted App supplies an
opaque action handle and declared input; the Zone 1 host supplies the active
App session, revision and host-minted idempotency/correlation value. Zone 2
resolves the handle server-side and returns only an atomic App replacement or
a stable safe outcome. App actions never create a model turn.

#### Zone 2 changes

1. Define a host-only App Action interface at the published MCP seam. It must be
   callable by the Zone 1 host but excluded from the local model catalogue.
2. Extend App definitions to declare opaque action handles and input schemas,
   rather than handing an iframe a backend capability ID.
3. Extend `AppInteractionSession` validation to bind and verify principal,
   organisation, entry capability, query fingerprint, permitted actions, subject
   scope and expiry on every action. Compare the values that are signed/stored;
   do not merely carry them.
4. Resolve a valid action into the normal governed request/execution path so policy
   evaluation, obligations, confirmation and audit remain authoritative.
5. Add `PaginatedListFactory` with Next/Previous and optional row actions. Keep
   `ItemListFactory` for static/simple lists rather than adding a large optional
   parameter surface to it.
6. Return `ReplaceApp` updates only in this phase.

#### Zone 1 changes

1. Add a generic `AppActionDispatcher` at the App-hosting seam. It accepts the
   mounted instance and opaque action request, then invokes the published Zone 2
   interface through the existing MCP gateway only.
2. Keep an App Action catalogue separate from `CapabilityCatalogue`. The local
   model must never discover or select App actions.
3. Upgrade `RuntimeTransport`, sidecar wire types and `PrefabOverlayPanel` to
   accept a typed `AppActionOutcome` and replace the mounted App tree atomically.
4. Preserve correlation IDs, cancellation/error behaviour and confirmation flows
   across the postMessage relay.
5. Do not add an NHS/Northstar conditional in the desktop renderer.

#### Security rules

- The host attaches the active app-session value; the iframe cannot select it.
- A stale, foreign, forged or cross-instance action handle fails before connector
  execution and is audited by Zone 2 where appropriate.
- The local host rejects action requests for a non-active app instance before
  crossing the Zone 1/Zone 2 seam.
- Every page is independently post-obligation filtered; cached rows are never used
  as a substitute for a governed page request.

#### Tests

| Level | Test | Expected invariant |
|---|---|---|
| Zone 2 unit | `tests/unit/test_paginated_list_factory.py` and `test_capability_registry.py`. | A tree gets only opaque action markers; a target must be `McpExposure.INTERNAL`. |
| Zone 2 application | `tests/application/test_mcp_app_actions.py::test_neutral_pager_rederives_successor_grants_without_exposing_cursor`. | Page 2 is governed, audited and produces a `ReplaceApp` outcome with a server-held successor cursor. |
| Zone 2 application | Action is valid in one App session but replayed in another. | Rejected; no connector call. |
| Zone 1 application | `runtime/tests/application/test_dispatch_app_action.py`. | An inactive, foreign or unknown handle is rejected before MCP invocation; a valid action does not create a turn. |
| Zone 1 contract | `runtime/tests/unit/test_app_action_gateway.py`, `test_app_action_mapping.py` and `test_invoke_app_action_endpoint.py`. | The host has one fixed action mount; model discovery and desktop wire receive no privileged session reference or raw result. |
| Desktop integration | Renderer clicks Next; receives JSON-RPC response; visible table changes from page 1 to page 2. | Real visual update, not only a generic response message. |
| Desktop regression | Direct action completes. | Conversation turns and model prompt token count are unchanged. |
| Release-level cross-zone | `runtime/tests/release/test_zone2_mcp_projection_release.py` against a configured synthetic endpoint. | Published MCP projections are consumed without Zone 1 importing Zone 2 helpers. |

#### Exit criteria

- One generic table pages in a real desktop/browser test.
- No App action target, cursor, session reference or source handle is published
  to the local model or iframe merely to make an App control work.
- Zone 1 receives an opaque App Update, not a JSON-encoded raw governed result in
  `response_text`.

#### Implementation verification record — 2026-09-04

The implementation is covered by the following completed checks:

- Zone 2 focused action, projection, session, factory and registry tests: **90
  passed**; affected-path Ruff and strict mypy are clean.
- Zone 1 focused projection, dispatcher, endpoint, checkpoint and architecture
  suite: **101 passed**; affected-path Ruff and mypy are clean; the Zone 1
  import-linter contracts are all kept.
- Desktop: **241 Vitest tests passed**, TypeScript type-check and
  lint/dependency-cruiser passed, and the Tauri library build passed.
- The release-level public-MCP test exists at
  `runtime/tests/release/test_zone2_mcp_projection_release.py`; it deliberately
  skips until a real synthetic Zone 2 endpoint and short-lived credential are
  supplied.

The phase must remain unmarked until its outstanding environment/repository
gates are addressed: this workspace cannot read the existing `uv` cache or
virtualenv Certifi bundle and cannot bind loopback test ports; Zone 1 has
unrelated full Ruff/mypy findings and its desktop Rust test target has existing
`start_dev_sidecar` signature mismatches; Zone 2 has unrelated repository-wide
Ruff findings and an existing import-linter configuration reference to a
missing demo module. None of these failures occur in the PP-2 action path.

### PP-3 — Northstar workboard proof profile

**Objective:** prove the generic interaction primitive first in the least
sensitive synthetic domain.

#### Work

##### Capability and fixture work

1. Keep `maintenance.get_shift_brief` as the broad semantic entry capability.
   Its default must mean `all_authorised_areas`, not “ask the model to choose a
   district.” Zone 2 derives the authorised operating areas from identity/policy.
2. Add 40–60 synthetic work orders across North and Central Districts, with
   priority, due time, status, asset class, crew state and a safe administrative
   summary. Keep all safety restrictions in the existing demo guide.
3. Add a paginated work-queue App action behind the generic interface; page size
   should be ten for a visible multi-page demonstration.
4. Add opaque row actions for work-order detail and available-crew view.
5. Preserve the current confirmation-gated audited crew-assignment capability.
6. Include fixtures for: critical/unassigned, planned, assigned, stale/source
   warning, unknown ID, expired action and a deliberate policy denial.

##### Demonstration script

1. Ask: “What needs attention this shift?”
2. Receive a broad, all-authorised-areas brief without a district clarification.
3. Open the governed work queue, page to later results, then inspect one critical
   work order.
4. Inspect a permitted crew option; assign it; approve the existing confirmation.
5. Show the resulting audit receipt and updated App state.

##### Acceptance tests

- A model/prompt test locks the broad-shift question to `get_shift_brief` without
  a mandatory operating-area argument.
- An application test verifies page 1, page 2, filter, expired action and row
  detail against the synthetic connector.
- A desktop e2e test records no model turn during page/detail navigation.
- The demo guide uses natural prompts, not capability names or synthetic IDs,
  except in a separate developer troubleshooting section.

#### Exit criteria

- The Northstar example uses only the generic pagination/action interfaces.
- Its script includes a positive path, a denial/expiry path and a
  confirmation/action-audit path.
- No work-queue browsing action increases local-model history.

#### Implementation status (5 September 2026)

Implementation is present but PP-3 remains open until the configured release
endpoint and desktop Playwright gates run in an environment that permits local
listeners.

- Zone 2 now has the deep `NorthstarScenario` domain module, its 50-record
  `northstar-workboard-v1` fixture, Work Order subject resolver, restrict-only
  Operating Area policy, signed query cursors, v2 semantic capabilities and the
  three internal App targets. Design details are in
  `SovereignAgenticArchitectureZoneTwo/docs/northstar-workboard.md`.
- The separate Northstar App Action Catalogue drives open, five fixed filters,
  previous/next, visible-row detail, crew options and both Back transitions.
  The generic `PaginatedListFactory` gained only reusable fixed-filter controls;
  Zone 1 gained no Northstar runtime branch.
- Zone 1's generic prompt now distinguishes user-facing domain references from
  forbidden technical identifiers. Its release test
  `test_real_northstar_app_navigation_stays_on_the_host_only_surface` performs
  open, page, filter, detail and crew transitions using only the two public MCP
  mounts and imports no Zone 2 code.
- Desktop has a test-only Northstar replacement fixture and Playwright tracer,
  plus a generic focus-restoration regression in `PrefabOverlayPanel`. The
  production host continues to treat every Prefab tree as opaque.
- Named Zone 2 proofs include
  `test_northstar_scenario_has_the_documented_fixture_distribution`,
  `test_all_areas_shift_brief_is_default_and_includes_both_districts`,
  `test_cursor_replay_across_a_different_scope_fails_closed`,
  `test_detail_and_crew_views_are_bound_to_the_visible_queue_page`,
  `test_northstar_app_state_machine_preserves_hidden_navigation_context`, and
  `test_northstar_app_navigation_targets_are_absent_from_model_tools`.
- The affected Zone 2 suite currently passes 90 tests with Ruff and mypy clean.
  Zone 1 prompt/release tests pass locally (release cases remain deselected
  without endpoint variables); the affected desktop suite passes 23 Vitest
  tests, TypeScript and dependency lint. The targeted Playwright test is
  authored but local execution is blocked by `listen EPERM` on
  `127.0.0.1:1420` in this workspace.

**Productisation direction:** PP-3 deliberately encodes the Northstar
Integration Definition in Python (`actions.py`, labels, views, capabilities and
module composition) to make the proof deterministic. That code is independent
of the in-process fixture choice: replacing the fixture with a real upstream
API would replace the Connector, not automatically remove the App declarations.
A later administration-plane phase must replace both NHS and Northstar profile
packages with validated, versioned and audited Integration Definition data.
Only allowlisted generic projection/binding strategies remain executable code;
administrators must not be able to upload Python, JavaScript, arbitrary Prefab,
credentials or policy-bypass expressions. The proof packages can be deleted
once that data-driven activation path has equivalent contract and regression
coverage.

That follow-on is now defined by the Zone 2
[Integration Definition SDK v2 reference architecture](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/dev/integration-definition-sdk-v2-reference-architecture.md)
and its
[multi-phase development plan](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/dev/integration-definition-sdk-v2-development-plan.md).
Those documents preserve the cross-zone App envelope in this roadmap; they do
not move definition authoring, compilation or activation into Zone 1.

**IDV2-0 baseline status (2026-09-07):** Zone 2 now contains the accepted
authoring-SPOT, hybrid-persistence and administration-authority decisions, an
architecture-protected empty `integration_administration` context, and reviewed
metadata-only NHS/Northstar v1 characterization manifests. Runtime authority is
unchanged and remains with legacy `UseCaseModule.register()`. The detailed
evidence and remaining Podman-backed completion gate are recorded in the Zone 2
[implementation status](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/implementation-status.md)
and the IDV2-0 section of the
[development plan](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/dev/integration-definition-sdk-v2-development-plan.md).

**IDV2-1 compiler-tracer status (2026-09-07):** Zone 2 now has a strict JSON
authoring adapter, immutable typed `IntegrationDefinitionV2` SPOT, installed
platform contract manifest and pure deterministic compiler producing separate
compiled snapshot values. The compiler is isolated from FastAPI, ORM, Prefab,
plugins, bootstrap and live adapters; its output is not installed. Legacy
`UseCaseModule.register()` therefore remains the only runtime authority. The
closed first grammar, safe error catalogue and three-digest construction are
carried forward in the Zone 2
[authoritative v2 capability grammar](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/dev/integration-definition-v2-minimal-grammar.md).
The root roadmap links that evidence rather than duplicating its evolving
Zone 2 contract. IDV2-1 remains implemented but not marked complete until the
inherited container-backed aggregate quality gate is green.

**IDV2-2 capability-contract status (2026-09-07):** Zone 2 now implements the
complete current capability, governance and maximum-result vocabulary, exact
installed connector-operation compatibility, stable model-discovery values and
a runtime-neutral result evaluator. The evaluator is the sole v2 boundary that
accepts connector-shaped mappings and returns distinct immutable public and
Projection-Private values; model and App projection inputs have no private
accessor. Test-only characterization proves the NHS and Northstar capability
catalogues are representable, but no compiled artefact is installed and legacy
registration remains the only runtime authority. The authoritative contract is
the Zone 2 [v2 capability grammar](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/dev/integration-definition-v2-minimal-grammar.md),
with measured gates in Zone 2
[implementation status](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/implementation-status.md).
The aggregate container-backed gate remains a completion prerequisite; this
root document deliberately does not duplicate the evolving field grammar.

**IDV2-3 presentation-contract status (2026-09-08):** Zone 2 now compiles
approved presentation bindings, bounded public-only Model Observation
strategies and fixed-precedence static prompt definitions into three separate
immutable catalogues. The generic Prefab adapter cannot receive
Projection-Private binding context, and the projection-only MCP helper cannot
receive a Governed Outcome. Test-only characterization represents the NHS and
Northstar list, detail, preview, confirmation and metric families without a
profile branch in generic runtime code. These artefacts remain inactive and
legacy registration remains authoritative. See the Zone 2
[authoritative v2 grammar](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/dev/integration-definition-v2-minimal-grammar.md),
[Integration author guide](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/dev/integration-definition-v2-presentation-author-guide.md)
and
[measured implementation status](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/implementation-status.md).
The locked Prefab/FastMCP dependency rerun and inherited container-backed
quality gate remain open; this root roadmap does not duplicate their details.

**IDV2-4/5 seam status (2026-09-08):** Zone 2 now has the isolated ten-row
compiled opaque-action tracer and the explicit Reasoning Disclosure compiler/
runtime seam. Reasoning tools are a separate deny-by-default catalogue;
registered/public capabilities are not implicitly exposed, server routing
inputs remain bound, and transformed outputs are bounded. NHS and Northstar
remain explicitly denied to Zone 3. The accepted Zone 2 decision and security
analysis are [ADR-0031](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/adr/0031-explicit-reasoning-disclosures-and-runtime-catalogue-port.md)
and the [Reasoning Disclosure threat model](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/security/reasoning-disclosure-threat-model.md).
Compiled snapshots remain inactive and the inherited aggregate gates remain
open; detailed evidence stays in the linked Zone 2 implementation status.

**IDV2-6 lifecycle/persistence status (2026-09-09):** Zone 2 now implements the
inactive Integration Administration lifecycle: immutable Draft revisions,
exact compiler evidence, four-eyes publication, structurally checked CAS
activation/rollback, canonical PostgreSQL artefacts and a generic non-request
activity audit identity. SQLAlchemy and JSONB mappings remain inside the Zone 2
infrastructure adapter; no snapshot pointer is read by live bootstrap and the
cross-zone MCP contract is unchanged. The normative implementation detail is in
the Zone 2 [lifecycle and persistence reference](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/dev/integration-definition-v2-lifecycle-and-persistence.md)
and [ADR-0032](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/adr/0032-generic-activity-audit-envelope.md).
Focused non-container tests pass; the Podman/PostgreSQL and inherited locked-
dependency aggregate gates remain open and are recorded, without duplicating
their Zone 2 details, in the linked implementation status.

### PP-4 — NHS Care synthetic clinical-record workspace proof profile

**Preconditions:** PP-1, PP-2 and PP-3 are complete. The NHS example reuses the
generic action/pagination interfaces; it must not introduce a second document-only
host protocol.

**Objective:** show why governed Apps outperform long edge-model conversation for
synthetic record review, without claiming a production patient-record viewer.

#### Work

##### Capability and fixture work

1. Add a synthetic, `DocumentReference`-like fixture corpus: at least three
   subjects, 30–50 documents per entitled subject, ten items per page, varied
   type/date/author/status/version and safe structured excerpts.
2. Start with a model-visible semantic entry capability such as
   `records.open_workspace`. Its Model Observation contains only a count, status
   and safe review indicator.
3. Add App actions for document page and document preview. They use opaque,
   session-bound handles and re-run normal scope/policy checks.
4. Render a structured preview in the first slice. Do not serve PDFs, browser
   network URLs, raw binary content or arbitrary FHIR paths yet.
5. Use a governed patient-selection App flow where names/DOB are visible only in
   the human App where policy permits. Do not solve selection by putting a raw
   `patients.list` result into the edge model.
6. Include a subject-out-of-scope fixture and a preview/action expiry fixture.

##### Demonstration script

1. Open the selected synthetic patient's record workspace.
2. The edge model says only that the workspace opened and how many documents need
   attention.
3. The clinician pages through the document list and previews one document.
4. Demonstrate that a different entitled clinician sees only their own synthetic
   subject scope; an out-of-scope selection is rejected.
5. Show the compact Model Observation versus the structured App payload in a
   developer-only trace/assertion, not in the clinician's normal UI.

##### Acceptance tests

- An application test proves each document page is re-authorised and filtered.
- A contract test proves document handles cannot be substituted for arbitrary
  URLs, resource IDs or paths.
- A sentinel regression proves the displayed document title/excerpt never enters
  a local-model prompt during browsing.
- A desktop e2e test covers page, preview, out-of-scope response and expiry.

#### Exit criteria

- The NHS example uses the same generic pagination/action interfaces proven in
  Northstar.
- Its script includes a positive path, a scope-denial path and an expiry/tamper
  path.
- No patient/document browsing action increases local-model history.

#### Implementation status (2026-09-05)

Implementation is present but PP-4 remains **open** until PP-3's configured
cross-zone endpoint and authored Playwright gates, plus the equivalent NHS live
gates, run successfully in an environment that permits local listeners.

- Zone 2 ADR-0027 now records one-to-many outcome-derived grants, strict
  marker/grant parity, the 64-grant bound, and opaque row selection.
- Northstar row selection now uses the same empty-input per-row grant contract.
- The mock-FHIR `nhs-record-workspace-v1` corpus provides 42/37/33 documents
  with 7/5/4 review indicators over HTTP.
- `patients.resolve` replaces bulk `patients.list`; `records.open_workspace` is
  model-visible while record index/page/preview targets are internal.
- [Zone 2 NHS workspace design](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/nhs-record-workspace.md)
  documents the state machine, entitlement, cursor, preview and Integration
  Definition seams.
- Named regressions include
  `test_collection_binding_issues_distinct_server_bound_row_grants`,
  `test_opaque_row_action_sends_handle_with_empty_input`,
  `test_document_model_projection_excludes_title_author_excerpt_and_canary`,
  `test_preview_back_returns_to_originating_page`, and
  `test_resolution_does_not_enumerate_demographics`, plus
  `test_every_transition_reauthorises_current_subject_scope`.
- Zone 1 contains only test-harness/release fixtures for NHS; production runtime,
  HTTP, MCP and desktop interfaces remain profile-neutral.
- The PP-4-focused Zone 2 suite passes 89 tests plus nine Redis App-session
  persistence tests; the relevant Zone 1
  orchestration/action/firewall suite passes 43 tests; the targeted desktop
  host/fixture suite passes 26 Vitest tests with TypeScript and dependency checks
  clean. The configured release suite collects three real-endpoint cases and
  skips when credentials are absent.
- The remaining live evidence is deliberately not waived: Testcontainers cannot
  start here because no Docker socket is available, while Playwright cannot bind
  its Vite listener (`listen EPERM` on `127.0.0.1:1420`). Repository-wide quality
  also reports pre-existing, unrelated lint/type/import/Rust-format failures.
  PP-4 therefore remains open rather than claiming release completion.

#### PP-4R follow-on — appointment resolution, App drill-down and checkpoint hardening

PP-4R is implemented through the local contract/unit layers but remains **open**
pending dependency-lock synchronization and configured endpoint/desktop gates.

- `appointments.get_details` v2 replaces source-ID input with the closed
  `next` / `previous` / `date_time` / `reference` selector language. Invalid,
  zero-match and multiple-match selections are governed business outcomes.
- `appointments.list` v2 returns ten of eleven active future appointments.
  Internal page/detail capabilities and four separately registered App actions
  provide opaque row drill-down and exact Back navigation with zero model turns.
- `nhs-appointment-schedule-v2` provides two fulfilled historical, eleven active
  future, and one cancelled appointment per synthetic Subject from one mutable,
  launch-clock-relative mock-FHIR store. The mock-FHIR image contract now proves
  both fixture modules are copied into the container.
- Capability string enums now traverse Zone 2 SDK → MCP JSON Schema → Zone 1
  anti-corruption mapping → local-model schema. Zone 1 rejects out-of-enum model
  calls before transport while Zone 2 remains authoritative.
- The common Zone 2 request handler now validates post-obligation results before
  completion. Public fields, projection-private top-level fields and
  projection-private list-row fields form one maximum contract; only the public
  fields are published. Undeclared row or top-level metadata produces
  `OUTPUT_CONTRACT_VIOLATION` consistently across transports.
- Zone 1 diagnostic prints were replaced with PHI-safe structured events carrying
  only interaction/action correlation, capability, ordinal/request correlation
  where available, and categorical outcomes.
- [Zone 2 appointment design](../../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/nhs-appointment-workflow.md)
  documents the selector, source clock, App state machine, authorization and
  containment rules. [Zone 1 ADR-0034](../../../SovereignAgenticArchitectureZoneOne/docs/adr/0034-langgraph-1-checkpoints-use-exact-symbol-allowlists.md)
  accepts LangGraph 1.x with no pickle fallback and exact-symbol checkpoint
  allowlists.
- The focused Zone 2 request/projection/NHS/Northstar slice passes 94 tests and
  source type-checking passes all 203 modules. The focused Zone 1
  orchestration/MCP/schema/App-isolation slice passes 61 tests; the checkpoint
  compatibility slice passes against the currently installed legacy package by
  proving the volatile demo disables checkpointing instead of constructing its
  permissive serializer.
- The Zone 1 dependency pins are updated to LangGraph 1.2.11, checkpoint 4.2.0,
  SQLite checkpoint 3.1.1 and LangChain Core 1.4.7+. This execution environment
  cannot regenerate `uv.lock`: its host uv cache is inaccessible and isolated
  network resolution is unavailable. Run `uv lock && uv sync --all-extras` in a
  normal development shell before recording the LangGraph 1.x restart tests.
- Container-backed tests remain blocked here by the unavailable Docker/Podman
  socket. Repository-wide Zone 2 lint also reports unrelated pre-existing test
  formatting findings outside PP-4R. These gates are not waived.

PP-4R closes only after the real synthetic endpoint proves semantic next,
previous, tomorrow-at-10, reference selection, opaque row detail/Back, booking
read-after-write, foreign-handle denial, zero navigation model turns, hardened
SQLite restart, and no Zone 3 invocation.

### Deferred follow-on — Explicit context promotion and App hardening

**Objective:** allow a deliberately chosen, minimised fact to reach the edge
model only after the core “App data is not model data” rule is proven.

**Preconditions:** PP-4 has completed and PP-6 has established the end-to-end
security/measurement baseline. This is not required to prove the reference
examples and must not be used to reintroduce generic App-data-to-model transfer.

#### Context promotion design

1. Introduce a separate Zone 2 semantic capability, for example
   `records.prepare_selected_context`, rather than a generic “send selection to
   chat” control.
2. Its input is an opaque selected-item handle plus a declared purpose/template;
   it resolves the real item inside Zone 2.
3. Its projector produces a bounded Model Observation with explicit fields,
   character/token cap, source reference and expiry. It must not return a raw
   document or the existing App payload.
4. It is independently policy-evaluated, audit-recorded and subject-scoped.
5. The first release should support only predefined context templates. Do not add
   free-form text selection or arbitrary excerpt length.

#### App-host hardening

1. Reconcile the live iframe sandbox flags with the ADR threat model before
   permitting richer record content. Record the WebKit requirement and its
   compensating controls, or restore the documented opaque-origin posture.
2. Add CSP/network/asset tests for the renderer. The App iframe must have no
   external network or direct host capability beyond the narrow postMessage bridge.
3. Add expiry/rotation cleanup for mounted App instances and an explicit response
   when an App is no longer active.
4. Record tokenomics: Model Observation characters/tokens, App payload size,
   action count, action latency and model turns per workflow.

#### Tests and exit criteria

- A promotion test proves that only the declared compact fields enter the next
  local-model prompt; source document text remains absent.
- A security test proves arbitrary text copied from an App cannot become model
  context through any frontend parameter.
- Renderer tests cover hostile/malformed App trees, external asset attempts and
  invalid postMessage origins/requests.
- The architecture demo can show measured “one semantic tool call; five human App
  actions; zero additional model turns.”

### PP-5 — BrandManifest v2 and presentation readiness

**Objective:** make the generic App host visibly adaptable without allowing
branding to become a data, identity or capability-control plane.

#### Manifest v2 scope

Add only host-owned, allow-listed presentation configuration:

- logical assets: `logo`, `mark`, `appIcon`, approved empty-state illustration;
- density: `comfortable` or `compact`;
- semantic design tokens for selection, elevation, informational state, overlay
  chrome and focus treatment;
- ordered labels/icons for known Zone 1 feature IDs;
- locale/fallback locale and constrained copy bundles;
- accessibility defaults: text scale, reduced motion and appearance preference;
- generic App viewport/table preferences such as density, font scale, radius and
  selected-row treatment.

Preserve the current three-way feature gate:

```text
brand request ∩ host deployment allowance ∩ build-supported feature
```

The manifest must never contain roles, purposes, realms, endpoint profiles, tool
or capability IDs, data fields, arbitrary CSS, executable component names, routes,
remote URLs or App tree content.

#### Implementation work

1. Publish one canonical versioned schema and verify any sample/documented
   manifests against the Zod schema in CI.
2. Correct current gaps: unused `appWidth`, alpha-aware contrast behaviour,
   hard-coded generic shell copy and documentation/schema drift.
3. Add generic feature IDs such as `app-workspace`, `document-viewer` and
   `audit-receipt`, but make them subject to the existing three-way gate.
4. Keep Zone 2 structural labels/columns/data in the App projectors; brands supply
   only renderer-wide style and accessibility preferences.
5. Add visual regression coverage for sign-in, long list, document preview,
   confirmation, narrow/wide view, keyboard focus and both reference brands.

#### Managed-branding future gate

Dynamic/tenant-managed branding is a later, separately approved capability. It
requires host-pinned signing keys, package hash/schema/asset verification, rollback
and expiry rules, and host mapping from verified organisation identity to a
pre-approved `BrandProfileId`. It must not be implemented as a token claim mapped
directly to a path or URL.

#### Exit criteria

- The same NHS and Northstar App structures render with distinct verified local
  presentation profiles without any change to Zone 2 capabilities/policy.
- A malformed or over-privileged manifest fails before React renders it.
- Visual and accessibility tests catch a token or layout regression.

### PP-6 — End-to-end hardening, demo script and documentation closure

**Objective:** turn the completed reference examples into repeatable architecture
proofs, not an engineer-operated happy path.

#### Work

1. Create two scripted desktop journeys with expected App states, safe audit/
   provenance assertions and an intentional negative scenario.
2. Publish a measurement capture for model-observation tokens, rich App payload
   size, model calls during navigation, action latency, and policy/audit count.
3. Run both repositories' normal quality gates, cross-zone MCP contract tests and
   desktop/browser tests from a documented, reproducible command.
4. Reconcile implementation status, the root Apps reference, demo guides, diagrams
   and ADR index entries with code/test evidence. A present-tense claim must be
   tied to a passing test or marked planned.
5. Generate fresh code graphs after code changes, following each repository's
   graphify instructions, and link relevant architecture documentation if module
   ownership changes.

#### Exit criteria

- Both proof profiles can be demonstrated from a clean local setup with no manual
  data manipulation.
- The “why Apps?” proof can be measured: one small semantic observation, several
  human App actions, no model turns during browsing, and an audited action.
- Documentation consistently calls both flows synthetic reference examples.

## 8. Zone 3 reasoning — open architecture decision track

Zone 3 is intentionally **not** on the implementation critical path above. The
current finding is sufficient to set a guardrail: do not enable cloud Zone 3 for
the NHS reference example. The fact that no NHS capability is currently
Zone-3-accessible is a useful baseline, not a completed architecture.

### What this plan does now

- Add a regression that NHS capabilities cannot become Zone-3-accessible without
  an explicit reviewed change.
- Keep the two reference examples entirely inside the Zone 1/Zone 2 App path.
- Use only synthetic data for any future Zone 3 exploratory prototype.
- Document the present limitations accurately; do not describe a planned context
  minimiser or reasoning-tool broker as shipped.

### Questions that must be resolved before a Zone 3 implementation plan

1. Is Zone 3 external, sovereign-hosted, on-premises, or a distinct confidential
   inference enclave? Each is a different trust assumption.
2. What classifications, if any, may cross into that environment? For the NHS
   reference posture, the answer is no PHI/PII/PSI, direct identifiers, patient
   identifiers, clinical free text or re-linkable opaque IDs.
3. Does patient-specific reasoning exist at all, or are only de-identified/
   aggregate analyses permitted?
4. What is the single Zone 2 egress-context compiler interface, and how is it
   reviewed, versioned, budgeted and audited?
5. How do child tool calls preserve the parent principal, purpose, subject scope,
   revocation and cumulative byte/time/call budgets without re-entering public
   REST/MCP endpoints?
6. What structured response schema, citation requirements and output validation
   prevent an external model from echoing protected input?
7. Which progress events are safe to show? The default must be Zone 2-generated
   status events, never raw tokens, prompts, chain-of-thought, tool arguments or
   tool results.

### Required decision artefacts before implementation

- A cross-zone ADR comparing the viable trust/deployment options and deciding the
  permitted data posture.
- Threat model and data-flow diagram, including indirect identifiers and model
  output echo paths.
- An explicit per-field cloud-egress taxonomy and default-deny policy.
- Interfaces for an egress-context compiler, session-bound reasoning-tool broker,
  structured response validator and safe-progress projector.
- Adversarial tests using synthetic sentinel identifiers/excerpts to prove no
  prohibited data reaches a provider request, child tool input, progress event or
  final response.

Until those artefacts are accepted, treat the present `Zone3ReasoningConnector`
implementation as an isolated research/legacy path, not a template for a patient
record feature.

## 9. Regression strategy and quality gates

Regression prevention is a deliverable in every phase, not a final cleanup.

| Layer | Required checks | Purpose |
|---|---|---|
| Zone 2 domain/application | Unit and application tests with in-memory fakes; `make architecture` after imports. | Keep policy, app-session and plugin boundaries deterministic. |
| Zone 2 contract | MCP result/action fixtures and authenticated visibility tests. | Detect cross-zone wire and discovery drift. |
| Zone 2 integration/e2e | Real app-session storage, outbox/audit and authenticated MCP path where required. | Prove no dev/fake shortcut masks a production seam failure. |
| Zone 1 unit/application | Outcome mapper, turn persistence, App Action dispatcher and host-gate fakes. | Prove raw governed payload cannot contaminate local model context. |
| Zone 1 contract/integration | Published MCP tool-result and App Action fixtures against a Zone 2-compatible server. | Preserve the MCP-only zone boundary. |
| Desktop | Component/integration tests plus browser/Playwright-style visual and interaction tests. | Prove a real App update, keyboard/focus behaviour and no renderer regression. |
| Reference examples | Scripted acceptance guides and fixture assertions. | Keep both examples synthetic, representative and repeatable. |
| Documentation | Status matrix and link/reference review in the change that alters behaviour. | Prevent implementation-plan drift. |

### Concrete initial test placement

Keep domain/example assertions in Zone 2 and generic host/context assertions in
Zone 1. Do not share private test helpers across repositories; use versioned MCP
fixtures or a fake/live MCP server at the published seam.

| Repository | Existing test seam to extend | First named regression to add |
|---|---|---|
| Zone 2 | `tests/application/test_mcp_projection.py` | `test_overlay_tool_content_is_the_only_model_projection` and a rich-data canary exclusion test |
| Zone 1 | `runtime/tests/unit/test_gateway_overlay_extraction.py` | `test_gateway_preserves_model_observation_separately_from_structured_result` |
| Zone 1 | `runtime/tests/unit/test_langgraph_orchestrator.py` | `test_tool_turn_uses_model_observation_not_governed_result` |
| Zone 1 | `runtime/tests/application/test_handle_interaction.py` | `test_persisted_turns_exclude_governed_app_canary` |
| Zone 1 | `runtime/tests/application/test_dispatch_app_action.py` | `test_host_action_replaces_the_mounted_app_without_creating_a_conversation_turn` |
| Zone 1 | `runtime/tests/unit/test_app_action_mapping.py` and `test_invoke_app_action_endpoint.py` | `test_action_mapper_rejects_text_or_raw_governed_result`; `test_legacy_direct_capability_route_is_not_exposed` |
| Zone 1 desktop | `desktop/src/features/conversation/PrefabOverlayPanel.test.tsx` | Host accepts only `apps.execute_action`, replaces the mounted tree, and does not return it in JSON-RPC. |
| Zone 2 | `tests/application/test_mcp_app_actions.py` | `test_changed_subject_scope_is_rejected_before_the_governed_request`; `test_stale_presentation_revision_is_rejected_before_the_governed_request` |
| Zone 2 | `tests/application/test_mcp_app_actions.py` | `test_neutral_pager_rederives_successor_grants_without_exposing_cursor` |
| Zone 2 | `tests/application/test_mcp_app_actions.py` | `test_internal_action_target_is_hidden_from_model_mcp_but_remains_governed` |
| Zone 2 | `tests/unit/test_infrastructure_maintenance_demo.py` | `test_all_areas_shift_brief_is_default_and_includes_both_districts` |
| Zone 2 | `tests/application/test_mcp_tools.py` | Extend `test_optional_capability_input_is_not_required_by_the_mcp_tool` for all-authorised-areas output |
| Zone 2 | New `tests/application/test_nhs_document_overlay.py` | `test_document_model_projection_excludes_title_author_excerpt_and_canary` |
| Zone 2 | New `tests/application/test_nhs_document_preview.py` | `test_preview_requires_safe_handle_not_path_url_or_raw_document_id` |
| Zone 1 desktop | New/repair Playwright command and visual suite | NHS/Northstar long-list, preview, confirmation and focus states |
| Both zones | Architecture test suites | Example modules cannot enable external reasoning while Zone 3 is deferred |

### Mandatory safety regression cases

- Sentinel patient name, DOB, ID and document excerpt visible in a permitted App
  but absent from every local-model prompt, turn and checkpoint.
- Model-visible semantic capability receives no backend/action tool descriptor.
- Direct App page/detail/preview action leaves model-turn count unchanged.
- Wrong principal, subject, organisation, entry query, session, action handle,
  cursor and expired handle all fail closed.
- An action denial, connector failure and confirmation refusal produce a safe App
  response without exposing internal stack data.
- The iframe cannot fetch external content, access host privileges directly or
  cause host action invocation outside the mounted instance protocol.
- NHS reference capabilities remain unavailable to Zone 3 while the decision is
  open.
- Brand manifests cannot enable an unavailable feature, add unsafe assets/CSS or
  influence fields/capabilities/policy.

## 10. Documentation deliverables by phase

| Document | Change point |
|---|---|
| This plan | Update phase status, resolved assumptions and links as each phase completes. |
| Root Apps architecture reference | Correct current-flow diagrams and mark direct App updates as planned/implemented accurately. |
| Root NHS/Northstar demo guides | Expand natural-language demo scripts and safety/fixture acceptance matrices. |
| Zone 1 implementation status and desktop docs | Describe the actual host/outcome/action contract and renderer posture. |
| Zone 2 Apps plan/status | Reconcile its historical Phase 5+ status with delivered code and this vertical slice. |
| Cross-zone ADRs | Record only hard-to-reverse projection/action contract decisions and, later, the Zone 3 decision. |
| Zone-specific `CONTEXT.md` files | Update concise glossary terms only when the implementation has adopted them. |

## 11. Sequencing and review checklist

Before approving a pull request for a phase, reviewers should answer:

1. Which module owns the new behaviour, and is its interface smaller than the
   implementation it hides?
2. Does either zone now know a domain term, policy rule or internal type owned by
   the other zone?
3. Does a direct App action still pass through Zone 2 policy, obligations and
   audit rather than a connector shortcut?
4. Could its data enter a model prompt, persistent turn, browser log or progress
   event? If yes, is that explicitly intended, minimised and tested?
5. Is the new capability model-visible, App-only, or confirmation-gated—and is
   that distinction enforced by the right catalogue/interface?
6. Are fixture data and documentation explicit that this is a synthetic reference
   example rather than a live deployment?
7. Did the change add the smallest useful test at the appropriate layer and run
   each repository's architecture gate after import changes?
8. Did the change update the current-state documentation rather than leaving a
   future design described as present tense?

## 12. First implementation slice

Begin with **PP-1 only**:

1. Add the typed projection split in the Zone 1 gateway/outcome path.
2. Change LangGraph history to consume only Zone 2's compact Model Observation.
3. Add sentinel-based Zone 1/Zone 2 contract and orchestration regression tests.
4. Correct the root Apps reference to reflect the resulting implemented flow.

That slice is narrow, high leverage and blocks neither reference example's domain
design. Once it is complete, PP-2 can introduce one generic App Action/Update
mechanism that both examples reuse.
