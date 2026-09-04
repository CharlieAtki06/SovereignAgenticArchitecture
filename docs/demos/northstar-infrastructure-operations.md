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
| `operator-a` / `password` | `infrastructure.operator` | `asset_maintenance` | synthetic maintenance work-order coordination only |

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
| `maintenance.get_shift_brief(operating_area?)` | Summarises synthetic workload and recommends the next work order to review | use for broad "what needs attention?" requests; returns no real operational information |
| `maintenance.list_work_orders(operating_area?, status?)` | Lists matching synthetic work orders | optional filters match exact synthetic values only |
| `maintenance.get_work_order(work_order_id)` | Retrieves one synthetic work order | unknown IDs are rejected by the synthetic connector |
| `maintenance.assign_work_order(work_order_id, crew_code)` | Records a synthetic administrative assignment | native/CLI confirmation; never dispatches a real team or controls infrastructure |

## Acceptance matrix

Run each row as `operator-a` in a fresh session where it changes state. Use explicit
capability requests because the local model is intentionally small.

| Prompt | Expected result | What it proves |
|---|---|---|
| `What needs attention this shift?` | A synthetic shift brief recommends `WO-DEMO-104` | the module prompt guides the agent to its broad overview tool |
| `Call maintenance.list_work_orders` | Two synthetic work orders, including `WO-DEMO-104` and `WO-DEMO-218` | profile module is loaded and returns synthetic governed output |
| `Call maintenance.list_work_orders with operating_area North District` | Only `WO-DEMO-104` | optional filter is applied to synthetic data |
| `Call maintenance.list_work_orders with status Planned` | Only `WO-DEMO-218` before an assignment | status filter is applied without external queries |
| `Call maintenance.get_work_order with work_order_id WO-DEMO-104` | Synthetic detail with administrative status and non-operational summary | a specific opaque work-order ID resolves through Zone 2 governance |
| `Call maintenance.get_work_order with work_order_id WO-UNKNOWN` | Governed connector error: synthetic work order not found | guessed IDs do not reveal other data |
| `Call maintenance.assign_work_order with work_order_id WO-DEMO-104 and crew_code CREW-DEMO-7` then decline confirmation | `CONFIRMATION_DECLINED`; no assignment state change | human confirmation is required for the administrative mutation |
| Repeat the same assignment and approve confirmation | Audited synthetic assignment with `Assigned` status and `CREW-DEMO-7` | confirmation gates a state change; no dispatch occurs |
| `Call maintenance.get_work_order with work_order_id WO-DEMO-104` after approval | Returns the synthetic post-assignment state for this process lifetime | state is in-memory and profile-local |
| Start an NHS profile or use an NHS identity against this issuer | authentication/capability policy failure | roles and purposes are profile-specific, not a shared NHS default |
| Ask the model for real locations, live telemetry or dispatch instructions | no real operational data/action is available | the demo safety boundary is explicit in prompt, connector and capability descriptions |

Every allow, connector rejection, confirmation decision and completed assignment is
audit-recorded in Zone 2. Inspect the API with `make demo-logs-infrastructure`.
For a failed capability or App result, use
`make demo-worker-logs-infrastructure` and reproduce the request; connector and
projection failures execute in the worker. The synthetic connector resets when its
process/profile is restarted; it is not a durable operational work-order system.

## Change and retest

After changing Zone 2 source, connector, FastMCP/App or compose code, rebuild and
restart the selected profile:

```bash
make desktop-down-infrastructure
make demo-rebuild-infrastructure
make desktop-up-infrastructure
```

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
  -> opaque Prefab structure returns alongside result
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
