# Northstar Infrastructure Operations demo

Northstar is a fictional, synthetic maintenance-coordination demonstration. It
contains no real sites, coordinates, telemetry, network topology, control values,
or physical instructions. `maintenance.assign_work_order` records an audited
administrative assignment in synthetic in-memory data; it never dispatches a person
or operates infrastructure.

This is the domain-specific acceptance guide. The shared
[identity and Keycloak guide](../keycloak-auth-testing.md) explains profile ownership,
authentication mechanics, lifecycle commands and cross-zone boundaries.

## Start the desktop application

For the normal interactive Northstar demonstration, run this from the root
workspace:

```bash
make desktop-up-infrastructure
```

Sign in as `operator-a` with password `password`. This starts the
`northstar-infrastructure-demo` Zone 2 profile and the desktop's local Zone 1
sidecar; it does not start the containerised edge. Close the desktop and run
`make desktop-down-infrastructure` to preserve data while stopping the profile.

Use `make demo-up-infrastructure` only for the headless containerised-edge and
CLI flow. Do not start both paths together.

## Start the headless profile

From the root workspace, run one profile only:

```bash
make demo-up-infrastructure
curl -fsS http://localhost:8000/health/ready
curl -fsS http://localhost:8090/health
```

The profile selects Zone 2's `northstar-infrastructure-demo` realm,
`InfrastructureMaintenanceDemoModule`, synthetic connector and the generic Zone 1
edge. Stop it with `make demo-down-infrastructure`. After deliberately changing the
realm export, discard only this profile's local state with the destructive
`make demo-reset-infrastructure`, then start it again.

## Seed identity and safety boundary

| User | Role | Purpose | Permitted work |
|---|---|---|---|
| `operator-a` / `password` | `infrastructure.operator` | `asset_maintenance` | synthetic North and Central District Work Orders |
| `operator-north` / `password` | `infrastructure.operator` | `asset_maintenance` | synthetic North District Work Orders only |

The source records are deliberately limited to synthetic IDs, broad fictional
operating areas, generic asset classes, administrative statuses and synthetic due
times. Do not add real facility names, coordinates, telemetry, topology, control
system values, physical instructions or external-system connections to this demo.

## Sign in through the CLI

```bash
cd ../SovereignAgenticArchitectureZoneOne
export ZONE1_HOST_SECRET=dev-secret

# Browser flow: sign in as operator-a/password at Keycloak.
uv run zone1 chat --login \
  --issuer http://localhost:8080/realms/northstar-infrastructure-demo \
  --client-id zone1-edge --secret dev-secret

# Scriptable development shortcut; never a production login flow.
uv run zone1 chat --as-user operator-a \
  --issuer http://localhost:8080/realms/northstar-infrastructure-demo \
  --client-id zone1-edge --secret dev-secret
```

The compiled Northstar desktop policy selects the host OIDC client configuration
and brand; neither value is supplied by the Zone 2 plugin or brand manifest.

## Capability catalogue

Every capability requires `infrastructure.operator`, purpose `asset_maintenance`,
and produces `CONFIDENTIAL` governed output.

| Capability | Behaviour | Safety and governance expectation |
|---|---|---|
| `maintenance.get_shift_brief` v2 (`operating_area?`) | Summarises every authorised area by default and recommends the next Work Order | use for broad "what needs attention?" requests; do not require a district clarification |
| `maintenance.list_work_orders` v2 (`operating_area?, status?`) | Returns the first governed ten-row Workboard page | later pages and App filters bypass the model |
| `maintenance.get_work_order(work_order_id)` | Retrieves one synthetic work order | unknown IDs are rejected by the synthetic connector |
| `maintenance.assign_work_order` v2 (`work_order_id, crew_reference`) | Records a synthetic administrative assignment | native/CLI confirmation; never dispatches a real team or controls infrastructure |

The host-only targets `maintenance.work_queue_page`,
`maintenance.work_order_app_detail` and `maintenance.available_crews` are
governed capabilities with internal MCP exposure. They are absent from the model
tool catalogue. The mounted App reaches them only through the separate
`apps.execute_action` surface and opaque, single-revision grants.

## Feature trigger map

Use the natural prompts in the first column for the normal demonstration. The
capability column is an observer's checkpoint, not wording the operator needs to
type.

| Operator prompt or App action | Expected route | Expected visible outcome |
|---|---|---|
| `What needs attention this shift?` | model calls `maintenance.get_shift_brief` without an Operating Area | two-area shift brief appears without a district clarification |
| Select **Open workboard** | host calls `apps.execute_action`; Zone 2 invokes `maintenance.work_queue_page` | first ten-row queue replaces the brief without a model turn |
| Select **Next**, **Previous** or a filter | opaque App action to `maintenance.work_queue_page` | the requested server-bound page/filter replaces the mounted App |
| Select a Work Order row | opaque App action to `maintenance.work_order_app_detail` | governed detail replaces the queue |
| Select **View available crews** | opaque App action to `maintenance.available_crews` | eligible synthetic crews replace the detail view |
| `Assign North Response Alpha to the recommended work order.` | model calls `maintenance.assign_work_order` | native confirmation appears before any mutation |

The local model never discovers the internal Workboard capabilities or
`apps.execute_action`. App browsing is read-only and creates neither model calls
nor transcript turns.

## Defined desktop acceptance tests

Run each test from a freshly started profile unless the test explicitly asks for
a short TTL. Perform the mutation test last because Northstar assignment state is
process-local.

### NORTHSTAR-PP3-01 — Broad brief and five-page Workboard

Preconditions: run `make desktop-up-infrastructure`, sign in as `operator-a` /
`password`, and start a new conversation.

| Step | Operator action | Required result |
|---|---|---|
| 1 | Enter `What needs attention this shift?` | The assistant does not ask for a district. The shift brief covers North and Central, reports 44 open, 6 Critical, 14 High priority and 16 Unassigned, and recommends `WO-DEMO-104`. |
| 2 | Note the transcript turn count, then select **Open workboard** | **Northstar workboard** page 1 contains ten rows, has **All** selected and exposes **Next**. No chat turn is added. |
| 3 | Select **Next** four times | Pages 2–4 contain ten rows each and page 5 contains four. **Next** is absent on page 5. No chat turn is added. |
| 4 | Select **Previous** four times | Page 1 returns. The transcript count is still the count recorded at step 2. |

Pass only when all 44 authorised open Work Orders can be traversed in the
10/10/10/10/4 distribution without another model call. Cursors, internal
capability names, App-session IDs and action handles must not be visible in chat
or the App.

### NORTHSTAR-PP3-02 — Filters, detail and crew options

Continue on Workboard page 1 from the preceding test.

| Step | Operator action | Required result |
|---|---|---|
| 1 | Select **Critical** | Six rows are shown and no **Next** control is present. |
| 2 | Select **Unassigned**, then **Next** | The filter contains 16 rows across pages of 10 and 6. |
| 3 | Select **Planned**, then **Next** | The filter contains 14 rows across pages of 10 and 4. |
| 4 | Select **Assigned**, then **Next** | The filter contains 14 rows across pages of 10 and 4. |
| 5 | Select **All** | The first ten-row page of the 44-record queue is restored. |
| 6 | Select the `WO-DEMO-104` row | **Maintenance work order** shows a Critical, Unassigned North District Work Order. |
| 7 | Select **View available crews** | The available-crew table includes `North Response Alpha`. |
| 8 | Select **Back to work order**, then **Back to workboard** | The detail and then the same All/page-1 queue are restored. No chat turn is added. |

Every selection in this test must be an opaque, zero-input host action. A visible
Work Order Reference helps the human identify a row but is not trusted as the
action's backend identifier.

### NORTHSTAR-PP3-03 — Conversational assignment

Return to chat and enter:

```text
Assign North Response Alpha to the recommended work order.
```

The initial shift-brief observation supplies the recommended user-facing Work
Order Reference; the operator supplies the crew reference. A native confirmation
must appear before the assignment executes.

1. Decline the first confirmation. Reopen `WO-DEMO-104`; it must remain
   Unassigned.
2. Repeat the prompt and approve it. Reopen the Work Order; it must show Assigned
   and `North Response Alpha`. Zone 2 must record the confirmation and completed
   execution in its audit trail.

Fail the test if App browsing performs the mutation, if the model asks for a
cursor/session/UUID, or if assignment occurs before approval.

### NORTHSTAR-PP3-04 — Scope denial

Sign in as `operator-north` and ask `What needs attention this shift?`. The brief
must cover only North District and report 22 open, 3 Critical, 7 High priority
and 8 Unassigned. Then ask `Show me the Central District shift brief.` The
request must be denied before connector execution without revealing Central
records.

### NORTHSTAR-PP3-05 — Expired action retains the current view

To reproduce expiry deterministically, stop the profile, then start it with a
short App-session TTL:

```bash
ZONE2_APP_SESSION_TTL_SECONDS=5 make desktop-up-infrastructure
```

Open the Workboard, wait at least five seconds, then select a filter or paging
control. The current App must remain mounted and expose only the generic safe
failure. No chat turn may be added. Stop the short-TTL profile after the test and
restart normally.

## ID-based developer troubleshooting

Use these only to isolate model-selection issues; they are not the primary demo:

| Request | Expected result |
|---|---|
| `Call maintenance.list_work_orders` | first ten of 44 authorised open records |
| `Call maintenance.list_work_orders with operating_area North District` | first ten of 22 North open records |
| `Call maintenance.get_work_order with work_order_id WO-DEMO-104` | Critical, Unassigned North synthetic detail |
| `Call maintenance.get_work_order with work_order_id WO-UNKNOWN` | the same safe unavailable response used for out-of-scope records |
| `Call maintenance.assign_work_order with work_order_id WO-DEMO-104 and crew_reference North Response Alpha` | native confirmation, then an audited administrative assignment if approved |

Every allow, connector rejection, confirmation decision and completed assignment is
audit-recorded in Zone 2. Inspect the API with `make demo-logs-infrastructure`.
For a failed capability or App result, use
`make demo-worker-logs-infrastructure` and reproduce the request; connector and
projection failures execute in the worker. The synthetic connector resets when
its process/profile is restarted; it is not a durable or multi-worker operational
work-order system. It plays the same upstream role as the NHS mock FHIR server,
but is deliberately in-process rather than reached over HTTP.

## Automated proof behind the script

The manual tests prove the operator experience. Run the focused Zone 2
regressions to prove server-bound filters, row grants, scope and mutation rules:

```bash
cd ../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo
uv run pytest -q \
  --ignore=.env.example \
  tests/unit/test_infrastructure_maintenance_demo.py \
  tests/unit/test_northstar_app_workflow.py \
  tests/application/test_app_action_catalogue.py \
  tests/unit/test_paginated_list_factory.py
```

The profile-neutral desktop harness has a separate Playwright proof of App
replacement, focus restoration, stale-action handling and unchanged model turn
count:

```bash
cd ../SovereignAgenticArchitectureZoneOne/desktop
bunx playwright test tests/visual/brand-fixtures.visual.spec.ts \
  --grep "Northstar App navigation"
```

With a real synthetic Zone 2 profile already running and the
`ZONE1_RELEASE_ZONE2_*` variables configured as documented at the top of the
release test, the generic Zone 1 suite proves that App navigation does not enter
model context. Without those variables the release cases are intentionally
skipped:

```bash
cd ../SovereignAgenticArchitectureZoneOne
make test-cross-zone
```

## Change and retest

The desktop start performs a cached build and ordered startup. After changing
Zone 2 source, connector, FastMCP/App or compose code, restart the selected
profile:

```bash
make desktop-down-infrastructure
make desktop-up-infrastructure
```

Insert `make demo-rebuild-infrastructure` only when you need to force-recreate
the freshly built profile containers.

After changing `keycloak/realms/northstar-infrastructure-demo.json`, run the
destructive `make demo-reset-infrastructure` before the final start. Keycloak
does not replace an imported realm in an existing profile database. See the
[local demo runbook](../dev/local-demo-runbook.md) for the complete lifecycle.

## Expected architecture flow

```text
Keycloak northstar-infrastructure-demo login
  -> Zone 1 stores opaque credential handle
  -> Zone 1 discovers/invokes published MCP capability
  -> Zone 2 validates role and asset_maintenance purpose
  -> synthetic connector returns only fixture data
  -> Zone 2 records audit/provenance and projects governed result
  -> compact model observation and opaque Prefab structure return independently
  -> App navigation uses host-only opaque grants with no model turn
  -> Zone 1 host applies the selected client brand
```

Zone 2 owns Northstar terminology, structural Prefab layout and governed results.
Zone 1 owns client brand, colour mode, accessibility validation and renderer theme
projection. The plugin must not supply CSS, theme values, visual-mode forcing or
external stylesheets.

## Troubleshooting

| Symptom | Resolution |
|---|---|
| Login issuer mismatch | Stop the active profile, start Northstar, and pass its issuer exactly; do not edit Keycloak through the console. |
| No maintenance tools | Confirm `make demo-up-infrastructure`, then inspect `make demo-logs-infrastructure`. |
| Port already in use | Only one profile may bind standard local ports; stop the other profile first. |
| Realm change has no effect | Run `make demo-reset-infrastructure`, then `make demo-up-infrastructure`. |
| Desktop opens the wrong realm | Stop the active profile and use root `make desktop-up-infrastructure`; its host deployment policy selects this profile's OIDC issuer. |
