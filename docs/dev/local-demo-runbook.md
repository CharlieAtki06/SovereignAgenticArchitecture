# Local demo runbook

This is the supported local-development entry point for the executable demos.
Use it from the **root workspace** (`SovereignAgenticArchitecture`), not from a
zone repository, when you want a complete NHS Care or Northstar desktop
experience.

## Choose the right command

Only one demo profile can use the standard local ports at a time.

| What you want to run | Where to run it | Command |
|---|---|---|
| NHS desktop (normal interactive path) | root workspace | `make desktop-up-nhs` |
| Northstar desktop (normal interactive path) | root workspace | `make desktop-up-infrastructure` |
| NHS headless edge + CLI path | root workspace | `make demo-up-nhs` |
| Northstar headless edge + CLI path | root workspace | `make demo-up-infrastructure` |
| Zone 2 services only | Zone 2 repository | `make demo-up-nhs` or `make demo-up-infrastructure` |
| Desktop host only, for maintainers | Zone 1 repository | `make desktop-dev DEPLOYMENT_POLICY=nhs` or `DEPLOYMENT_POLICY=northstar-infrastructure` |

`desktop-up-*` starts the selected Zone 2 profile and the desktop's **local**
Zone 1 sidecar. `demo-up-*` starts the selected Zone 2 profile and the
**containerised** Zone 1 edge. Do not start both for the same profile: that
would create two edges competing for the same local services.

## NHS Care: first run

Prerequisites: the three sibling repositories are present (`./setup.sh` handles
this for a fresh checkout), Docker or Podman is running, and Zone 1's local
model prerequisites are configured as described in its README.

From the root workspace:

```bash
make desktop-up-nhs
```

Wait for the desktop sign-in screen, then use:

```text
Username: clinician-a
Password: password
```

The desktop uses the `nhs-demo` Keycloak realm, the NHS desktop deployment
policy and Zone 2's NHS module. Those are selected in their own layers; the
desktop does not read a realm export or enable a Zone 2 plugin.

For a quick governed check, ask:

```text
What patients do I have?
```

Then ask for Alice's appointments. The NHS capability/entitlement matrix is in
[NHS Care](../demos/nhs-care.md).

## Stop, rebuild and reset

Close the desktop before stopping the profile. A normal stop preserves its
profile-local database and realm state:

```bash
make desktop-down-nhs
```

After changing Zone 2 Python, FastMCP/App, connector or compose code, rebuild
the selected Zone 2 image before restarting the desktop:

```bash
make desktop-down-nhs
make demo-rebuild-nhs
make desktop-up-nhs
```

Use the matching `*-infrastructure` commands for Northstar. `demo-rebuild-*`
rebuilds the Zone 2 image only; it is safe and does not delete data.

After changing a committed Keycloak realm export, the realm must be imported
into a fresh profile database. This reset is intentionally destructive, but is
scoped to the selected profile:

```bash
make desktop-down-nhs
make demo-reset-nhs
make desktop-up-nhs
```

If both Zone 2 code and realm data changed, run `make demo-rebuild-nhs` between
the reset and the final `desktop-up-nhs`.

## Logs and common diagnosis

Open a second terminal in the root workspace while the profile is running:

```bash
make demo-logs-nhs          # Zone 2 API: startup, authentication and MCP ingress
make demo-worker-logs-nhs   # Zone 2 worker: connector, App projection and execution errors
```

Most MCP capability execution is asynchronous. If discovery and a simple tool
work but a result-producing call says it could not complete, keep
`demo-worker-logs-nhs` open and reproduce the request; the worker log is the
authoritative first place to inspect. Use `demo-logs-nhs` for sign-in, issuer
and MCP request-admission problems.

| Symptom | First action |
|---|---|
| A profile will not start or the API never becomes ready | `make demo-logs-nhs` |
| A capability is discovered but fails while executing | `make demo-worker-logs-nhs` |
| A source fix seems unchanged | rebuild, then stop/start the selected profile |
| A realm JSON edit has no effect | reset, then start the selected profile |
| A port is already in use | stop the active `desktop-*` or `demo-*` profile before starting the other |
| Desktop signs in to the wrong profile | stop it and start the matching root `desktop-up-*` command |

## Headless and zone-local work

Use the root headless path only when testing the containerised edge and CLI:

```bash
make demo-up-nhs
cd ../SovereignAgenticArchitectureZoneOne
uv run zone1 chat --login \
  --issuer http://localhost:8080/realms/nhs-demo \
  --client-id zone1-edge --secret dev-secret
```

Zone 2 maintainers can run `make demo-up-nhs` inside Zone 2 to work on the
governed services only. Zone 1 maintainers can run
`make desktop-dev DEPLOYMENT_POLICY=nhs` inside Zone 1, but must already have
the matching Zone 2 profile running and must configure a real MCP sidecar if
they are testing integration. These are intentionally narrower, zone-local
commands; they are not replacements for root `desktop-up-nhs`.

For identity ownership and exact CLI verification, see
[Identity, Keycloak and governed demo testing](../keycloak-auth-testing.md).
