# NHS Care demo

This guide is the domain-specific acceptance guide for the local NHS Care demo.
It complements the cross-profile [identity and Keycloak guide](../keycloak-auth-testing.md),
which explains shared profile ownership, startup, authentication and reset rules.

The demo uses synthetic/mock clinical data. It is a governed-access demonstration,
not a clinical system and not a source of patient-care advice.

## Start the desktop application

For the normal interactive NHS demonstration, run this from the root workspace:

```bash
make desktop-up-nhs
```

Sign in as `clinician-a` with password `password`. This command starts the
`nhs-demo` Zone 2 profile and the NHS desktop's local Zone 1 sidecar; it does
not start the containerised edge. Close the desktop, then run
`make desktop-down-nhs` to stop the profile while preserving local data.

Use `make demo-up-nhs` instead only when you deliberately want the headless
containerised edge and CLI flow below. Do not run both paths together.

## Start the headless profile

From the root workspace, start the NHS profile and no other profile:

```bash
make demo-up-nhs
curl -fsS http://localhost:8000/health/ready
curl -fsS http://localhost:8090/health
```

The profile selects the Zone 2 `nhs-demo` realm, `NhsModule`, mock FHIR connector
and the generic Zone 1 edge. To stop it, run `make demo-down-nhs`. To deliberately
discard local profile state after a realm change, run the destructive
`make desktop-reset-nhs`. That single command resets only the synthetic NHS
profile, rebuilds Zone 2, waits for mock FHIR, Keycloak and the governed API,
then launches the desktop.

## Seed identities and entitlement data

All local seed users use password `password`.

| User | Role | Purpose | Entitled subjects |
|---|---|---|---|
| `clinician-a` | `clinician` | `direct_care` | `patient-1`, `patient-2` |
| `clinician-b` | `clinician` | `direct_care` | `patient-3` |
| `patient-x` | `patient` | `self_service` | self-service identity only |

Subject entitlement is not trusted from a model prompt or embedded as an access
token list. Zone 2 derives it at runtime from mock FHIR CareTeam data using the
authenticated caller's `preferred_username`.

## Sign in through the CLI

```bash
cd ../SovereignAgenticArchitectureZoneOne
export ZONE1_HOST_SECRET=dev-secret

# Browser login: open Keycloak, then sign in as clinician-a/password.
uv run zone1 chat --login \
  --issuer http://localhost:8080/realms/nhs-demo \
  --client-id zone1-edge --secret dev-secret

# Scriptable local-development shortcut; not a production login flow.
uv run zone1 chat --as-user clinician-a \
  --issuer http://localhost:8080/realms/nhs-demo \
  --client-id zone1-edge --secret dev-secret
```

Use `Ctrl-D` to leave a session and log in as another test identity. The
desktop path is described above; it signs in against `nhs-demo` and starts no
containerised edge.

## Demonstration workflows

All NHS capabilities require `direct_care`. Record browsing is App-only after
the initial semantic call; appointment booking remains conversational and
confirmation-gated.

| Capability | Behaviour | Governance expectation |
|---|---|---|
| `records.open_workspace()` | Opens the authorised record selector | aggregate-only model observation; rich rows stay in the App |
| `patients.resolve(patient_name)` | Resolves one clinician-supplied exact name | returns only an internal routing value; never enumerates patients |
| `appointments.list(subject_id)` | Lists a governed subject's appointments | scope check before connector access |
| `appointments.get_details(subject_id, selection_mode, ...)` | Selects one appointment by `next`, `previous`, local date/time, or human reference | technical source IDs are not accepted or disclosed |
| `appointments.book(subject_id, date, reason)` | Requests an appointment booking | native/CLI confirmation before audited execution |

The internal record capabilities and `appointments.list_page` /
`appointments.app_detail` are absent from model discovery. The generic host
invokes them only through `apps.execute_action` using opaque row or navigation
handles.

### Feature trigger map

Use the natural prompts in the first column for the normal demonstration. The
capability column is an observer's checkpoint, not wording the operator needs to
type.

| Operator prompt or App action | Expected route | Expected visible outcome |
|---|---|---|
| `Open the clinical-record workspace.` | model calls `records.open_workspace` once | aggregate chat acknowledgement plus the authorised record selector |
| Select a patient row | host calls `apps.execute_action`; Zone 2 invokes `records.document_page` | first ten-document page replaces the selector without a model turn |
| Select **Next** or **Previous** | opaque App action to `records.document_page` | the adjacent page replaces the mounted App |
| Select a document row | opaque App action to `records.document_preview` | bounded structured plain-text preview replaces the document page |
| Select **Back to documents** or **Back to records** | opaque App action to an internal governed capability | originating page or record selector is reconstructed |
| `Show me Alice Johnson's appointments.` | `patients.resolve`, then `appointments.list` | an **Appointments** App shows ten of eleven active appointments |
| Select an appointment row, then **Back to appointments** | opaque App actions to `appointments.app_detail` / `appointments.list_page` | detail and the exact originating page replace one another with zero model turns |
| `Show me the details of Alice Johnson's next appointment.` | `patients.resolve`, then `appointments.get_details(selection_mode=next)` | the launch-relative next appointment is selected without a technical ID |
| `What was Alice Johnson's last appointment about?` | `appointments.get_details(selection_mode=previous)` | the latest fulfilled appointment is selected |
| `Show me Alice Johnson's appointment tomorrow at 10:00.` | `appointments.get_details(selection_mode=date_time, date_reference=tomorrow, local_time=10:00)` | exact Europe/London local-minute selection |
| `Show details for Alice Johnson's appointment APT-DEMO-103.` | `appointments.get_details(selection_mode=reference)` | the human-facing reference is resolved within Alice's authorised schedule |
| `Book a review appointment for Alice Johnson on 10 September 2026 for a medication review.` | `patients.resolve`, then `appointments.book` | native confirmation appears before any mutation |

The local model never discovers the three internal record capabilities or
`apps.execute_action`. Conversely, selecting rows and navigation controls does
not create a model request or add a chat turn.

## Defined desktop acceptance tests

Run each test from a freshly started profile unless the test explicitly asks for
a short TTL. Use the exact prompts: the edge model is deliberately small, so the
test should not depend on paraphrase quality.

### NHS-PP4-01 — Record workspace, paging and preview

Preconditions: run `make desktop-up-nhs`, sign in as `clinician-a` / `password`,
and start a new conversation.

| Step | Operator action | Required result |
|---|---|---|
| 1 | Enter `Open the clinical-record workspace.` | Chat reports exactly 2 authorised records, 79 documents and 12 marked for review. It does not name a patient or document. |
| 2 | Inspect the **Synthetic clinical-record workspace** App | It contains only Alice Johnson and Bob Williams. Alice shows 42 documents and 7 for review; Bob shows 37 and 5. |
| 3 | Note the transcript turn count, then click anywhere on the Alice Johnson row (there is deliberately no separate **Open** button) | **Synthetic clinical documents** replaces the selector. Page 1 contains ten rows and a **Next** control; no chat turn is added. |
| 4 | Select **Next** | Page 2 replaces page 1, contains ten different rows, and has **Previous** and **Next** controls. No chat turn is added. |
| 5 | Select **Previous** | Page 1 is restored. No chat turn is added. |
| 6 | Select `Sentinel structured review record` | **Synthetic document preview** shows Discharge summary, 2026-01-01, Synthetic Acute Team, current, version 1 and Review required. The Summary section contains the synthetic canary text. |
| 7 | Select **Back to documents** | The exact originating page 1 is restored. |
| 8 | Select **Back to records** | The Alice/Bob selector is restored. The transcript count is still the count recorded at step 3. |

Pass only when steps 3–8 add zero model calls and zero transcript turns. Patient
or document source IDs, cursors, App-session IDs and action handles must not be
visible in chat or the App. The distinctive preview text is allowed only inside
the secure App; it must not appear in the transcript.

To demonstrate all five Alice pages, repeat step 4 until **Next** disappears.
The page sizes are 10, 10, 10, 10 and 2; use **Back to records** afterwards to
reset the navigation path.

### NHS-PP4R-02 — Appointment list, App detail and semantic conversation

Preconditions: sign in as `clinician-a` and use a new conversation.

1. Enter `Show me Alice Johnson's appointments.` The model resolves Alice by
   exact name and calls `appointments.list`; the **Appointments** App contains
   ten rows and **Next**. The compact model observation reports eleven active
   upcoming appointments but contains no row data.
2. Record the transcript length and select an appointment row. The
   **Appointment** detail App replaces the list without a model call or chat
   turn. Select **Back to appointments** and confirm the same page returns.
3. Select **Next**, open the sole row on page 2, then return. All navigation
   remains App-only and the transcript length is unchanged.
4. Enter `Show me the details of Alice Johnson's next appointment.` The result
   is tomorrow at 10:00 in the clock-relative synthetic corpus.
5. Enter `What was Alice Johnson's last appointment about?` The result is the
   latest fulfilled appointment, seven days before fixture launch.
6. Enter `Show me Alice Johnson's appointment tomorrow at 10:00.` The model
   supplies `date_time`, `tomorrow`, and `10:00`; it must not invent a date.
7. Enter `Show details for Alice Johnson's appointment APT-DEMO-103.` The model
   uses the human-facing reference selector.

The model may reuse the resolved `subject_id` from governed tool history for
routing, but must never ask for it, quote it, or accept a source appointment ID.
`APT-DEMO-103` is a human-facing synthetic Appointment Reference. A row click
sends only an opaque action handle and `{}`; the source appointment reference
remains inside Zone 2.

### NHS-PP4-03 — Conversational booking and confirmation

Preconditions: sign in as `clinician-a` and use a new conversation. Enter:

```text
Book a review appointment for Alice Johnson on 10 September 2026 for a medication review.
```

The model must resolve the clinician-supplied exact name and request
`appointments.book` without asking the operator for `subject_id`. A native
confirmation must appear before the synthetic booking executes.

1. Decline the confirmation on the first attempt. The assistant reports the
   decline and no booking is created.
2. Repeat the same prompt and approve it. The booking completes and Zone 2
   records the confirmation decision and execution in its audit trail.

Fail the test if the model enumerates patients, asks for or quotes a subject ID,
or if either attempt mutates state before approval.

### NHS-PP4-04 — Entitlement separation

Stop the current desktop session, restart the same NHS profile if needed, and
sign in as `clinician-b` / `password`. In a new conversation enter:
`Open the clinical-record workspace.`

The chat result must report 1 authorised record, 33 documents and 4 marked for
review. The App must contain only Carol Davies. Alice Johnson and Bob Williams
must be absent from both chat and the App.

Then sign back in as `clinician-a` and enter:

```text
Book a review appointment for Carol Davies on 10 September 2026 for a medication review.
```

The request must produce the same safe resolution failure as an unknown or
ambiguous name, without revealing that Carol exists outside the caller's scope.

### NHS-PP4-05 — Expired App action retains the current view

Stop the normal profile and start it with a short App-session TTL:

```bash
ZONE2_APP_SESSION_TTL_SECONDS=2 make desktop-up-nhs
```

Sign in as `clinician-b`, open the workspace and select Carol Davies promptly.
Wait at least three seconds on document page 1, then select **Next**. The action
must return the generic safe rejection, add no chat turn and leave page 1
mounted. Stop the short-TTL profile after the test and restart normally.

Cross-principal handle replay is deliberately a developer test rather than a
manual desktop step: raw handles must not be copied from or displayed by the
operator UI.

## Additional policy spot checks

Run each row in a fresh signed-in conversation for the named identity. These are
short policy checks rather than replacements for the desktop workflow above.

| Logged in as | Prompt | Expected result | What it proves |
|---|---|---|---|
| `clinician-a` | `Open the clinical-record workspace` | Alice and Bob selector; 79 documents, 12 for review | broad query is filtered to the current Subject scope |
| `clinician-b` | `Open the clinical-record workspace` | Carol selector; 33 documents, 4 for review | different identity receives a different governed scope |
| `clinician-a` | `Show me Alice Johnson's appointments` | exact resolution, then page 1 of 2 (10 of 11 active rows) | patient routing remains narrow while appointment data uses the App projection |
| `clinician-a` | Select an appointment row | App-only governed detail and exact Back navigation | no source identifier, model call, or transcript turn |
| `clinician-a` | `Show me the details of Alice Johnson's next appointment` | tomorrow-at-10 clock-relative detail | semantic selection does not require a source ID |
| `clinician-a` | `Book a review appointment for Alice Johnson on 2026-09-10 for a medication review` | exact resolution then confirmation | routing ID stays internal and writes remain human-gated |
| `clinician-a` | `Book a review appointment for Carol Davies on 2026-09-10 for a medication review` | same safe resolution failure as an unknown/ambiguous name | patient-3 is outside the current care-team scope |
| `patient-x` | Any `appointments.*` call | `purpose_not_permitted` | `self_service` does not satisfy `direct_care` |
| Any user | Ask the model “what user am I?” | No authenticated identity is revealed to the model | identity remains outside model context |

Every allow, denial, confirmation decision and completed execution is recorded in
Zone 2's audit trail. Inspect API/authentication activity with
`make demo-logs-nhs`. Keep `make demo-worker-logs-nhs` open while reproducing a
failed appointment/App result: the worker executes governed connector work and
produces the actionable stack trace. Use the governed audit interfaces appropriate
to the local environment for detailed records.

## Automated proof behind the script

The manual checks above prove the operator experience. Run the focused Zone 2
regressions to prove the boundaries that are intentionally invisible in the UI:

```bash
cd ../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo
uv run pytest -q \
  --ignore=.env.example \
  tests/application/test_nhs_workspace_workflow.py \
  tests/application/test_nhs_document_overlay.py \
  tests/application/test_nhs_document_preview.py \
  tests/application/test_execute_request.py \
  tests/contract/test_nhs_patient_resolution.py \
  tests/unit/test_request_scope_snapshot.py \
  tests/unit/test_nhs_mock_fhir_api.py
```

The profile-neutral desktop harness has a separate Playwright proof of App
replacement, focus restoration, expired-action handling and unchanged model
turn count:

```bash
cd ../SovereignAgenticArchitectureZoneOne/desktop
bunx playwright test tests/visual/brand-fixtures.visual.spec.ts \
  --grep "NHS record browsing"
```

This Playwright test uses only the visual harness. The real-endpoint release
test is `make test-cross-zone` in Zone 1 and requires the
`ZONE1_RELEASE_NHS_ZONE2_*` variables documented at the top of
`runtime/tests/release/test_zone2_mcp_projection_release.py`; without those
variables the NHS release case is intentionally skipped.

With the NHS profile running and the release-test environment configured, run
the real cross-zone contract from Zone 1:

```bash
cd ../SovereignAgenticArchitectureZoneOne
make test-cross-zone
```

That release suite selects records only through row handles, performs Next,
Previous, preview and both Back actions, replays a foreign handle, exercises
expiry, and asserts that model-call and transcript counts do not change during
App navigation. It uses the configured Zone 2 endpoint rather than shared Zone
2 test helpers.

## Conversation troubleshooting

| Symptom | Expected interpretation and action |
|---|---|
| Startup stops after printing `sovereign-zone2-nhs_mock-fhir_1` | The next line should now say `Waiting for NHS upstream service...`. If it then fails, inspect `podman logs sovereign-zone2-nhs_mock-fhir_1`; the governed API is deliberately not started while its record source is unavailable. |
| The assistant says the workspace opened but its selector is empty | This is not valid for `clinician-a`. If the realm was changed, close the desktop and run `make desktop-reset-nhs`; a rebuild preserves the old imported realm. Otherwise restart normally and inspect `make demo-worker-logs-nhs`. |
| `Alice` does not resolve | Resolution deliberately requires the full exact name. Enter `Alice Johnson`; the assistant should ask for the full name before calling a capability when only `Alice` is supplied. |
| `patient-1` is entered in chat | Do not use it in the operator workflow. It is an internal Subject reference, not a patient name; the assistant must ask for the patient's full name rather than treating it as routing input. |
| Keycloak logs say `Realm 'nhs-demo' already exists. Import skipped` after a realm-file change | Close the desktop and run the destructive profile-scoped `make desktop-reset-nhs`, then sign in again. An ordinary code or database-migration change does not require this reset. |

## Change and retest

Zone 2 source is built into its profile image. The desktop start performs a
cached build and ordered startup, so after changing NHS connector, module,
FastMCP/App or compose code, restart through:

```bash
make desktop-down-nhs
make desktop-up-nhs
```

Insert `make demo-rebuild-nhs` only when you need to force-recreate the
freshly built profile containers.

After changing `keycloak/realms/nhs-demo.json`, use the destructive
`make desktop-reset-nhs`, because Keycloak does not replace an imported realm
in an existing profile database. Full lifecycle detail is in
the [local demo runbook](../dev/local-demo-runbook.md).

## Expected architecture flow

```text
Keycloak nhs-demo login
  -> Zone 1 stores opaque credential handle
  -> Zone 1 discovers/invokes published MCP capability
  -> Zone 2 validates token, role, purpose and subject scope
  -> mock FHIR HTTP connector returns permitted synthetic data
  -> Zone 2 audits and minimises result
  -> compact observation goes to the model; opaque Prefab goes to the App
  -> App actions re-enter governance with server-bound subject/cursor/document data
  -> Zone 1 host applies its client brand
```

Developer-only traces may compare the aggregate observation with the App tree.
Patient names, dates of birth, document titles/authors, source references,
cursors and excerpts must be absent from local-model requests, transcript turns,
checkpoints, logs and non-App desktop response fields.

The final presentation step does not give the NHS plugin authority over client
colours, theme mode, fonts or external stylesheets. Zone 2 owns NHS terminology
and structural layout; Zone 1 owns client appearance.
