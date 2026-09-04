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
`make demo-reset-nhs` and then start it again.

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

## Capability catalogue

All appointment capabilities require `direct_care` and a subject in the caller's
governed scope.

| Capability | Behaviour | Governance expectation |
|---|---|---|
| `patients.list()` | Lists patients on the caller's care team | caller-specific FHIR entitlement lookup |
| `appointments.list(subject_id)` | Lists a governed subject's appointments | scope check before connector access |
| `appointments.get_details(subject_id, appointment_id)` | Returns one governed appointment detail | scope and field-disclosure rules apply |
| `appointments.book(subject_id, date, reason)` | Requests an appointment booking | native/CLI confirmation before audited execution |

## Acceptance matrix

Run each row in a fresh CLI session for the named identity. Use explicit prompts;
the local model is deliberately small.

| Logged in as | Prompt | Expected result | What it proves |
|---|---|---|---|
| `clinician-a` | `Call appointments.list with subject_id patient-1` | Allowed; governed appointment list | clinician-a is entitled to patient-1 |
| `clinician-a` | `Call appointments.get_details with subject_id patient-2 and appointment_id appt-1` | Allowed; governed appointment detail | clinician-a is entitled to patient-2 |
| `clinician-a` | `Call appointments.book with subject_id patient-1 and date 2026-09-10 and reason review` | Confirmation prompt; approve to create audited booking, decline for `CONFIRMATION_DECLINED` | write operations require human confirmation |
| `clinician-a` | Any appointment call for `patient-3` | `subject_out_of_scope` | patient-3 belongs to clinician-b's care team |
| `clinician-a` | Any appointment call for an unknown subject such as `josh` | `subject_out_of_scope` | guessed identifiers do not enlarge scope |
| `clinician-b` | `Call appointments.list with subject_id patient-3` | Allowed | a different identity receives a different governed scope |
| `clinician-b` | Any appointment call for `patient-1` | `subject_out_of_scope` | scope is enforced per caller, not per tool name |
| `patient-x` | Any `appointments.*` call | `purpose_not_permitted` | `self_service` does not satisfy `direct_care` |
| Any user | Ask the model “what user am I?” | No authenticated identity is revealed to the model | identity remains outside model context |

Every allow, denial, confirmation decision and completed execution is recorded in
Zone 2's audit trail. Inspect API/authentication activity with
`make demo-logs-nhs`. Keep `make demo-worker-logs-nhs` open while reproducing a
failed appointment/App result: the worker executes governed connector work and
produces the actionable stack trace. Use the governed audit interfaces appropriate
to the local environment for detailed records.

## Change and retest

Zone 2 source is built into its profile image. After changing NHS connector,
module, FastMCP/App or compose code, restart through:

```bash
make desktop-down-nhs
make demo-rebuild-nhs
make desktop-up-nhs
```

After changing `keycloak/realms/nhs-demo.json`, use the destructive
`make demo-reset-nhs` before the final start, because Keycloak does not replace
an imported realm in an existing profile database. Full lifecycle detail is in
the [local demo runbook](../dev/local-demo-runbook.md).

## Expected architecture flow

```text
Keycloak nhs-demo login
  -> Zone 1 stores opaque credential handle
  -> Zone 1 discovers/invokes published MCP capability
  -> Zone 2 validates token, role, purpose and subject scope
  -> mock FHIR connector returns permitted data
  -> Zone 2 audits and minimises result
  -> opaque Prefab structure returns with governed result
  -> Zone 1 host applies its client brand
```

The final presentation step does not give the NHS plugin authority over client
colours, theme mode, fonts or external stylesheets. Zone 2 owns NHS terminology
and structural layout; Zone 1 owns client appearance.
