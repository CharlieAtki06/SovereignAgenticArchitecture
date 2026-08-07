# Identity, Keycloak & governance — testing guide

**Audience:** anyone testing or demoing the edge → Zone 2 auth flow. This tells you how the
Keycloak-backed identity is set up, who the test users are, what they can and cannot do, and exactly
what to expect when you drive it from the CLI.

> This is a **dev/test** setup. TLS is relaxed, passwords are all `password`, and the local host
> secret is a fixed `dev-secret`. None of that is how production runs — see [Not production](#not-production).

For Keycloak realm internals (mappers, endpoints, config vars) the authoritative reference is
Zone 2's [`docs/dev/keycloak.md`](../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/dev/keycloak.md).

---

## 1. The model in one picture

There are **two independent boundaries** — don't conflate them:

```
[ CLI / React / Flutter ]  --X-Host-Secret-->  [ Zone 1 edge host ]  --OIDC JWT-->  [ Zone 2 ]
                           hop 1                                     hop 2
                     local access control                     real identity + governance
                        (dev-secret)                     (Keycloak-issued access token)
```

- **Hop 1 — host secret (`dev-secret`).** A shared secret gating the edge host's local HTTP port.
  It is *not* an identity; it only decides who may drive this edge process. Set it once via
  `ZONE1_HOST_SECRET` and you never type it again.
- **Hop 2 — OIDC token.** The real identity. The user logs in at **Keycloak**, the edge carries the
  resulting **access token** to Zone 2, and Zone 2 verifies it and governs every call. The token is
  registered once and only an opaque handle travels thereafter — it never reaches the model, tool
  arguments, logs, or the wire.

Zone 2 governs each call on **three orthogonal axes**:

| Axis | Question | Source | Example denial |
|---|---|---|---|
| **roles** | *what operations?* | `realm_access.roles` claim + capability's `required_roles` | `role_not_permitted` |
| **purpose** | *why? (lawful basis)* | `purpose` claim + capability's `permitted_purposes` | `purpose_not_permitted` |
| **entitlement** | *which subjects?* | `practitioner_id` claim → FHIR `CareTeam` lookup → allowed subjects | `subject_out_of_scope` |

---

## 2. How Keycloak is set up

- **IdP:** Keycloak 26.7, co-located inside Zone 2's boundary (no egress). Postgres-backed.
- **Realm:** `sovereign`, defined **as code** in
  `SovereignAgenticArchitectureZoneTwo/keycloak/realm-export.json` and imported on first start
  (`--import-realm`). No manual console clicking — the file is the source of truth.
- **Client `zone1-edge`:** public client with
  - **Authorization Code + PKCE (S256)** — the production browser login (`zone1 chat --login`),
  - **Direct Access Grants (password/ROPC)** — the dev-only shortcut (`zone1 chat --as-user`),
  - loopback redirect URIs including `http://127.0.0.1:8250/callback`.
- **Claims** the token carries (into the **access** token): `sub`, `realm_access.roles`, `purpose`,
  `practitioner_id` (or `subject_id`), and `aud = zone2-mcp` (Zone 2's audience).
- **Issuer / JWKS split:** issuer is `http://localhost:8080/realms/sovereign` (stable via
  `KC_HOSTNAME`); Zone 2 fetches signing keys in-network from `http://keycloak:8080/...`. This is
  why a browser/CLI on your host and a containerised Zone 2 agree on the token.

Zone 2 verifies the token with `ZONE2_AUTH_PROVIDER=oidc` + `ZONE2_OIDC_ISSUER` / `_JWKS_URI` /
`_AUDIENCE=zone2-mcp`. `ZONE2_OIDC_REQUIRED_SCOPES` is empty in dev (no scope gate).

---

## 3. Test users & what they can access

All users have password **`password`**.

| Username | Role | `purpose` | Identity claim | Entitled subjects |
|---|---|---|---|---|
| **clinician-a** | `clinician` | `direct_care` | `practitioner_id=practitioner-a` | `patient-1`, `patient-2` |
| **clinician-b** | `clinician` | `direct_care` | `practitioner_id=practitioner-b` | `patient-3` |
| **patient-x** | `patient` | `self_service` | `subject_id=patient-x` | — (self-service only) |

Entitlement (who can see which subject) is **not** in the token — it's resolved at runtime from the
mock FHIR `CareTeam` (`SovereignAgenticArchitectureZoneTwo/mock-fhir`), seeded as:

```
practitioner-a → [patient-1, patient-2]
practitioner-b → [patient-3]
```

### The NHS capabilities

Tool names are **`domain.action`** (the vendor is the *deployment* — each enterprise runs its own governed
Zone 2, selected by `ZONE2_ENABLED_USE_CASE_MODULES` — so the `nhs.` prefix would be redundant in the name).
All three require **purpose `direct_care`** and a **subject you're entitled to**:

| Tool | What it does | Notes |
|---|---|---|
| `appointments.list(subject_id)` | List a patient's appointments (summary per item) | **Returns a list** — each item is field-limited by governance (`patient_reference` stripped per item) |
| `appointments.get_details(subject_id, appointment_id)` | One appointment's detail + preparation | `appointment_id` can be any string (mock returns canned data) |
| `appointments.book(subject_id, date, reason)` | **Book** an appointment | **Write + HITL**: requires human confirmation before it runs; audited |

`demo.get_profile` belongs to a different module and is **not** granted to clinicians (useful for seeing
role/purpose denials).

---

## 4. Bring up the stack

From the **root** repo (needs a host Ollama serving the edge model):

```bash
make up          # Zone 2 (Postgres, Redis, Keycloak, mock-FHIR, api, worker) + the Zone 1 edge
make ps          # see everything running
```

Wait until Keycloak and the Zone 2 `api` are healthy:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/health/ready   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8090/health          # 200 (edge)
```

Admin console (dev only): <http://localhost:8080> — `admin` / `admin`.

> **⚠ Changing the realm file** (`realm-export.json`) does nothing on an existing DB — Keycloak logs
> `Realm 'sovereign' already exists. Import skipped`. To re-import: `make down`, then wipe the
> Keycloak DB (`cd` into the Zone 2 repo and `podman compose down -v`), then `make up`.

---

## 5. Log in and test via the CLI

```bash
cd ../SovereignAgenticArchitectureZoneOne
export ZONE1_HOST_SECRET=dev-secret     # hop-1 secret; set once, never type it again
```

**Production login (browser Authorization-Code + PKCE):**
```bash
uv run zone1 chat --login
```
Your **browser opens on the Keycloak login page** — enter e.g. `clinician-a` / `password` *there*
(never in the terminal). The terminal picks up the redirect and opens a governed session. This is the
exact flow the React (keycloak-js) and Flutter (flutter_appauth) wrappers will use.

**Dev login (scriptable, no browser):**
```bash
uv run zone1 chat --as-user clinician-a       # OAuth password grant (ROPC) — prints a dev-only notice
```
Use this for piped/automated runs; `--login` is interactive.

Useful flags: `--issuer` (default `http://localhost:8080/realms/sovereign`), `--client-id`
(`zone1-edge`), `--redirect-port` (`8250`), `--secret` (overrides `ZONE1_HOST_SECRET`).

**Tip:** the local model is small, so phrase tool requests explicitly — name the capability and its
arguments, e.g.:
```
Call appointments.list with subject_id patient-1
Call appointments.get_details with appointment_id appt-1 and subject_id patient-1
Call appointments.book with subject_id patient-1 and date 2026-09-10 and reason review
```
(The `book` one triggers a **confirmation prompt** in the terminal — answer `y`/`n`.)

---

## 6. What to expect — test matrix

Log in as the user in column 1, send the prompt, expect the outcome. (Ctrl-D quits a session so you
can switch users.)

| Logged in as | Prompt | Expected result | Why |
|---|---|---|---|
| clinician-a | `list … subject_id patient-1` | ✅ **allowed** — list of appointments (`patient_reference` stripped from every item) | in scope + `direct_care` |
| clinician-a | `get_details … subject_id patient-2` | ✅ **allowed** — status/start/location/preparation | also in scope |
| clinician-a | `book … subject_id patient-1 …` | ⚠️ **confirmation prompt** → approve → ✅ booked (audited); decline → `CONFIRMATION_DECLINED` | HITL write, entitlement-scoped |
| clinician-a | any `… subject_id patient-3` | ✗ **`subject_out_of_scope`** | patient-3 is clinician-b's |
| clinician-a | `… subject_id josh` / unknown | ✗ **`subject_out_of_scope`** | not an entitled subject |
| **clinician-b** | `… subject_id patient-3` | ✅ **allowed** | in *their* scope |
| clinician-b | `… subject_id patient-1` | ✗ **`subject_out_of_scope`** | not their patient |
| clinician-a | ask for `demo.get_profile` | ✗ **`role_not_permitted` + `purpose_not_permitted`** | different module, not granted |
| **patient-x** | any `appointments.…` call | ✗ **`purpose_not_permitted`** | purpose is `self_service`, capability needs `direct_care` |
| any | ask "what user am I?" | model replies it doesn't know | **by design** — identity never enters the model |

The headline is the middle rows: **the same edge, the same tool, different users → different
allow/deny.** That's multi-user governance, and the deny is enforced at Zone 2, not the model.

Every decision (allow or deny) is written to Zone 2's immutable **audit log**.

---

## 7. Other ways to test

- **Fetch a token directly (no CLI)** — dev password grant, then decode its claims:
  ```bash
  curl -s http://localhost:8080/realms/sovereign/protocol/openid-connect/token \
    -d grant_type=password -d client_id=zone1-edge \
    -d username=clinician-a -d password=password \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])'
  ```
  Decode to confirm `aud=zone2-mcp`, `realm_access.roles`, `purpose`, `practitioner_id` (see
  Zone 2's keycloak.md for the one-liner).
- **Automated tests** — Zone 1: `make test` (includes `test_cli_oidc.py`, which covers the browser
  flow's PKCE/state/callback without a real browser). Zone 2: `make test` (identity, policy,
  entitlement, e2e allow/deny).
- **MCP Inspector / Swagger** — point them at Zone 2's `http://localhost:8000/mcp` with a
  `Authorization: Bearer <token>` header (token from the curl above) to invoke tools directly,
  bypassing the model.

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `subject_out_of_scope` on a call you expected to work | You used a subject the logged-in user isn't entitled to. clinician-a → patient-1/2; clinician-b → patient-3. |
| "what user am I?" returns nothing | Intended — the model has no identity. |
| New redirect URI / realm edit not taking effect | Realm import is skipped when the realm exists — re-import (`down -v`, then `make up`). |
| `--login` hangs / "cannot start callback server on 127.0.0.1:8250" | Port 8250 busy — pass `--redirect-port <free port>` (and add the matching redirect URI to the realm if you change it). |
| `No host secret` on start | `export ZONE1_HOST_SECRET=dev-secret` (or pass `--secret`). |
| 401 from the edge | Wrong/missing host secret (hop 1), unrelated to your Keycloak login. |

---

## 9. Not production

This setup is for local testing and demos. For production you would:

- run Keycloak in `start` mode behind TLS + a reverse proxy (not `start-dev`);
- replace the seeded users/passwords with a real user directory (and enable MFA/SSO — which, because
  login happens on Keycloak's page, needs **zero** edge/CLI changes);
- source entitlements from the real enterprise system behind Zone 2's connector (the mock FHIR is a
  stand-in — the port is real, the data is stubbed);
- provision the host secret as an ephemeral per-launch value (not a fixed `dev-secret`), and settle
  the sidecar-vs-hosted deployment topology (Zone 1 ADR-0012 leaves this open).

The React NHS UI and Flutter shell still need their own login screens built — the CLI's `--login`
is the working **reference** of the pattern, not those UIs.
