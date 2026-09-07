# Identity, Keycloak and governed demo testing

**Audience:** developers running either local demonstration end to end. This guide
explains ownership, safe profile selection, and how to verify governed access.

> This is local development only. Seed passwords are `password`, the edge host
> secret is `dev-secret`, and TLS is relaxed. None of these values are production-safe.

For realm and compose internals, see Zone 2's
[Keycloak profile guide](../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/dev/keycloak.md).
For domain-level acceptance flows, use [NHS Care](demos/nhs-care.md) and
[Northstar Infrastructure Operations](demos/northstar-infrastructure-operations.md).

## Boundaries and ownership

```text
CLI or desktop -- local host secret --> Zone 1 edge -- OIDC access token --> Zone 2
                                                                  |
                                                           policy + audit
                                                                  |
                                                           governed connector
```

The host secret gates access to a local Zone 1 process; it is not a user identity.
Keycloak issues the user token, and Zone 2 verifies it and applies role, purpose,
scope and field-disclosure policy to every capability call. Zone 1 retains an opaque
credential handle after login; it does not pass a token to the model or inspect
Zone 2 domain data.

Keycloak and its realm exports are **Zone 2 deployment configuration**. Zone 1 is
a generic OIDC client. A brand manifest is presentation-only and must never contain
a realm, user, role, purpose, module or Keycloak endpoint.

## What selects a local demo

The following are independent ownership axes. They are composed by a named local
profile, but none is allowed to absorb another's responsibilities.

| Axis | Owner | Selects | Must not contain |
|---|---|---|---|
| Client brand manifest | Zone 1 | colours, typography/layout tokens, copy and native visual identity | realm, issuer, user, role, purpose, module or capability |
| Desktop deployment policy | Zone 1 host | selected brand and, once delivered, generic OIDC client values | Keycloak realm data or demo business logic |
| Realm-as-code | Zone 2 deployment | one realm's users, roles, purposes, client mapper and issuer | Zone 1 brand or renderer detail |
| Zone 2 module and App overlay | Zone 2 | domain capabilities, governed connector, terminology and structural Prefab layout | client palette, theme mode, CSS or external stylesheet |
| Compose profile | local orchestration | exactly one realm + exactly one domain module + demo-only dependency wiring | a new Zone 1/Zone 2 runtime protocol |

The active profile model is **one realm and one domain module on the standard
ports at a time**. NHS and Northstar may coexist as source code and realm exports,
but a developer starts one profile, signs into that realm, tests its capabilities,
and stops it before starting the other. Their roles, purposes and vocabulary never
need to be combined in one local deployment.

### Command truth table

| Need | Supported command today | Status |
|---|---|---|
| Start full NHS demo | root: `make demo-up-nhs` | supported |
| Start full Northstar demo | root: `make demo-up-infrastructure` | supported |
| Stop either desktop demo | root: matching `desktop-down-*` | supported; preserves profile data |
| Inspect API / worker logs | root: matching `demo-logs-*` / `demo-worker-logs-*` | supported; use worker logs for asynchronous capability/App failures |
| Force-recreate Zone 2 after a cached build | root: matching `demo-rebuild-*` | supported; preserves data |
| Reset either profile after realm-export changes | root: matching `demo-reset-*`, then start it | supported; reset is destructive |
| Start governed layer only | Zone 2: matching `make demo-up-*` | supported |
| Exercise a selected profile | Zone 1: `uv run zone1 chat` with that profile's explicit `--issuer` | supported |
| Start NHS desktop demo | root: `make desktop-up-nhs` | supported; starts NHS Zone 2 services and one local desktop sidecar |
| Start Northstar desktop demo | root: `make desktop-up-infrastructure` | supported; starts Northstar Zone 2 services and one local desktop sidecar |

`make up` remains a maintainer base-stack path. `make desktop-dev` is Zone 1's
generic maintainer command and requires an explicit deployment policy; root
`desktop-up-*` commands are the supported cross-zone profile path.

## Choose one profile

Only one profile may use the normal local ports at a time. Stop the active profile
before starting another.

| Demo | Root command | Realm / issuer | Test identity | Expected governed work |
|---|---|---|---|---|
| NHS care | `make demo-up-nhs` | `nhs-demo` / `http://localhost:8080/realms/nhs-demo` | `clinician-a` / `password` | patient and appointment capabilities under `direct_care` |
| Northstar Infrastructure Operations | `make demo-up-infrastructure` | `northstar-infrastructure-demo` / `http://localhost:8080/realms/northstar-infrastructure-demo` | `operator-a` or `operator-north` / `password` | synthetic work orders under `asset_maintenance`; North-only denial proof with `operator-north` |

Named commands avoid manual module, realm, issuer and network settings. The root
Makefile starts a Zone 2 compose overlay, then attaches the generic edge to that
profile's Zone 2 network.

## Start, verify, stop and reset

From this root workspace:

```bash
# Start one profile.
make demo-up-nhs
# or
make demo-up-infrastructure

# Verify the selected profile.
curl -fsS http://localhost:8000/health/ready
curl -fsS http://localhost:8090/health
make ps

# Stop it while preserving local data.
make demo-down-nhs
# or
make demo-down-infrastructure
```

The root workspace exposes profile-scoped logs and destructive resets:

```bash
make demo-logs-nhs
make demo-worker-logs-nhs          # asynchronous connector execution failures
make demo-reset-nhs                 # deletes only NHS profile containers/volumes
make demo-logs-infrastructure
make demo-worker-logs-infrastructure
make demo-reset-infrastructure      # deletes only Infrastructure profile containers/volumes
```

Keycloak imports a realm only into a fresh profile database. After changing
`keycloak/realms/<profile>.json`, run that profile's `demo-reset-*` then
`demo-up-*`. Do not make console edits: the JSON export is the reviewable,
repeatable source of truth. The local console at <http://localhost:8080>
(`admin` / `admin`) is inspection-only.

### Desktop lifecycle

For the normal interactive path, run from the root workspace:

```bash
make desktop-up-nhs
# or
make desktop-up-infrastructure
```

This starts the selected Zone 2 services and one local desktop sidecar. It does
not start the containerised Zone 1 edge, so do not first run the matching
`demo-up-*` command. Stop the profile after closing the desktop:

```bash
make desktop-down-nhs
```

`desktop-up-*` performs a cached profile build and an explicitly ordered,
bounded startup, so ordinary Zone 2 code, connector, FastMCP/App or compose
changes need only a stop and start:

```bash
make desktop-down-nhs
make desktop-up-nhs
```

Use `make demo-rebuild-nhs` before the start only when a force-recreate is
needed. The matching infrastructure commands follow the same pattern. The
detailed, copyable workflow is maintained in the
[local demo runbook](dev/local-demo-runbook.md).

## CLI testing

The CLI accepts explicit OIDC options. The desktop has its own compiled,
host-only OIDC deployment policy; the CLI remains useful for scripted profile
checks and does not infer a demo issuer.

```bash
cd ../SovereignAgenticArchitectureZoneOne
export ZONE1_HOST_SECRET=dev-secret

# NHS browser login (Authorization Code + PKCE)
uv run zone1 chat --login \
  --issuer http://localhost:8080/realms/nhs-demo \
  --client-id zone1-edge --secret dev-secret

# Northstar scriptable development login (Direct Access Grant)
uv run zone1 chat --as-user operator-a \
  --issuer http://localhost:8080/realms/northstar-infrastructure-demo \
  --client-id zone1-edge --secret dev-secret
```

For an NHS scripted login, use issuer `nhs-demo` and `--as-user clinician-a`.
The browser flow opens Keycloak; enter the profile's seed user there. Never put
a password in a model prompt or capability argument.

### Verification prompts

Use explicit capability requests because the local model is small:

| Profile | Prompt | Expected result |
|---|---|---|
| NHS | `Call appointments.list with subject_id patient-1` | allowed for `clinician-a` only when subject policy permits it |
| NHS | `Call appointments.book with subject_id patient-1 and date 2026-09-10 and reason review` | confirmation before an audited write |
| Northstar | `Call maintenance.list_work_orders` | synthetic `CONFIDENTIAL` work-order list |
| Northstar | `Call maintenance.get_work_order with work_order_id WO-DEMO-104` | synthetic item detail and structural overlay |
| Northstar | `Call maintenance.assign_work_order with work_order_id WO-DEMO-104 and crew_reference North Response Alpha` | confirmation, then audited administrative assignment only; never real dispatch |

Northstar contains no real facilities, coordinates, telemetry, topology, control
values or operational instructions.

The full NHS identity/entitlement allow-deny matrix, seed-user catalogue and
appointment acceptance flow are intentionally maintained in the dedicated
[NHS Care demo guide](demos/nhs-care.md), rather than duplicated here.

## What Zone 2 verifies

Each selected profile issues tokens for the `zone2-mcp` audience, with a
Zone-2-owned `caller_zone=zone1` mapper and profile-specific role/purpose claims.
Zone 2 evaluates independent policy axes before a connector is reached:

| Axis | Question | Source | Example denial or effect |
|---|---|---|---|
| Role | Which operations may this identity request? | `realm_access.roles` and the capability definition | `role_not_permitted` |
| Purpose | Why is the operation permitted? | profile `purpose` claim and capability definition | `purpose_not_permitted` |
| Scope | Which domain subjects/assets are in scope? | governed connector/entitlement data, not the model | `subject_out_of_scope` where applicable |
| Caller zone | Which execution boundary made the request? | `caller_zone` client mapper | selects the applicable disclosure policy |
| Field disclosure | Which result fields may cross the boundary? | capability disclosure rules and obligations | fields are minimised before the response leaves Zone 2 |

Every allow, deny, confirmation decision and execution is audit-recorded in Zone 2.

The UI overlay returned with a result is opaque Prefab structure: Zone 2 supplies
domain labels and layout while Zone 1 applies the active host brand palette.

### Browser login mechanics

`zone1 chat --login` uses Authorization Code with PKCE S256. It opens the
profile issuer's authorisation endpoint with a random state and a loopback
redirect; after the user signs in, it validates the returned state and exchanges
the code with its original PKCE verifier. `zone1-edge` is a public client, so no
client secret is placed in the desktop or CLI. The CLI's `--as-user` route uses a
development-only Direct Access Grant for scriptable checks; do not model it as a
production sign-in route.

## Desktop profile login

The desktop's compiled deployment policy carries host-only OIDC configuration
(issuer, public client ID, loopback port and credential-store namespace). The
renderer receives only brand ID and allowed UI features. Use root
`make desktop-up-nhs` or `make desktop-up-infrastructure`; these start the selected
Zone 2 services and the desktop's own local sidecar, never the containerised edge.

## Troubleshooting

| Symptom | Resolution |
|---|---|
| Port already in use | Run the matching root `make demo-down-*`; only one profile binds default ports. |
| Realm edit has no effect | Run that profile's `demo-reset-*`, then the matching `desktop-up-*` or `demo-up-*`; imports skip existing realms. |
| A discovered tool or App result fails | Keep `make demo-worker-logs-<profile>` open, reproduce the request, and inspect its worker trace; the API log is for admission/authentication. |
| Zone 2 source fix has no effect | Stop the profile, run `make demo-rebuild-<profile>`, then start the matching desktop. |
| `401` from Zone 1 | Check `ZONE1_HOST_SECRET` / `--secret`; this is independent of OIDC login. |
| Token issuer mismatch | Match the CLI `--issuer` exactly to the running profile. Do not patch Zone 1 source or Keycloak manually. |
| No expected capability | Confirm `make ps`, then inspect the selected profile's `demo-logs-*`; profiles load different modules. |
| Desktop login opens the wrong realm | Stop the active profile, then use the matching root `desktop-up-*` target. |

## Production notes

Production requires TLS, real identity-provider integration, MFA/SSO, non-seeded
credentials, managed secret delivery and production entitlement/data connectors.
The local profile mechanism is a reproducible developer experience, not a
production tenant-selection mechanism.
