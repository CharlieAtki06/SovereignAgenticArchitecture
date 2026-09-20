---
title: Deployment topology
sidebar_position: 5
---

# Deployment topology — what actually runs

The [system map](system-map.md) shows the architecture as three zones. This page
shows the processes you can actually see with `podman ps`, because the
Governance Gateway is one logical zone and several processes on your laptop.

Everything below comes from `docker-compose.yml` and `compose.demos/nhs.yml` in
Zone 2, and `docker-compose.yml` in Zone 1. Vocabulary is the
[glossary](glossary.md)'s.

---

## The NHS demo, as it runs today

<ArchitectureView viewId="deployment_variants" mode="embedded" />

### The services

| Service | Image | Port | What it does |
|---|---|---|---|
| `postgres` | `postgres:17` | 5432 | Every durable thing: governed requests, audit log, outbox, compiled snapshots, policy decisions. Also hosts Keycloak's own database. |
| `redis` | `redis:7-alpine` | 6379 | App session store (ADR-0022). Not a cache for governed data. |
| `keycloak` | `keycloak:26.7` | 8080 | OIDC identity, realm `nhs-demo`. Co-located deliberately — no egress (ADR-0019). |
| `mock-fhir` | built locally | 8001 | Stands in for the Systems of Record. Synthetic data only. |
| `api` | `sovereign-zone2:local` | 8000 | The governed MCP surface at `/mcp`. |
| `worker` | `sovereign-zone2:local` | — | Drains the transactional outbox and reconciles the runtime catalogue. |
| `zone1-edge` | `sovereign-zone1:local` | 8090 | The containerised edge — **headless path only**. |

### The one-shot jobs

These exit after running, and two of them are **gates** — the API will not start
until they succeed. This ordering is the thing most people miss:

| Job | Gates | Why it matters |
|---|---|---|
| `keycloak-db-init` | `keycloak` | Creates Keycloak's database on the shared Postgres. |
| `migrate` | `api`, `worker` | The only service with `build:` — it builds `sovereign-zone2:local`, which `api` and `worker` then reuse. Build once, no per-service image drift. |
| `nhs-provision` | `api`, `worker` | Compiles the Integration Definition seed and activates the snapshot. **The API has no capabilities until this succeeds.** |

That last row is the important one. The Gateway does not ship with the NHS
capabilities compiled in — it boots against whatever snapshot `nhs-provision`
activated. See [snapshot lifecycle](how-it-works/snapshot-lifecycle.md).

---

## Two paths, and you cannot run both

| | Desktop path | Headless path |
|---|---|---|
| Command | `make desktop-up-nhs` | `make demo-up-nhs` |
| Edge runs as | Tauri app + **local** sidecar process | `zone1-edge` **container** |
| Used for | The normal interactive demo | CLI testing, `zone1 chat` |

Both bind the same local ports, so only one profile can hold them at a time.
The root Makefile has an `assert-no-container-edge` guard on the desktop targets
for exactly this reason.

---

## Be honest about where the models run

This is the part of the demo most likely to draw a sharp question, so do not let
the diagram imply otherwise.

**Today, in the demo, both models are the same Ollama on your laptop:**

| | Setting | Default |
|---|---|---|
| Edge model | `ZONE1_MODEL` @ `ZONE1_MODEL_ENDPOINT` | `gemma4:e4b-it-q4_K_M` @ `host.containers.internal:11434` |
| Reasoning model | `ZONE2_REASONING_MODEL` @ `ZONE2_REASONING_MODEL_ENDPOINT` | `gemma4:e4b-it-q4_K_M` @ `host.containers.internal:11434` |

Same tag, same endpoint, same machine. The architecture treats the Reasoning
Plane as untrusted; the *demo* runs it next to everything else because that is
what a laptop can do offline.

**What that does and does not invalidate:**

- It does **not** weaken the attribute-control demonstration. The Gateway
  filters fields before they leave it, and it filters them identically whether
  the model is on localhost or in someone else's cloud. The canary test proves
  the filtering, not the network hop.
- It **does** mean "the data never leaves your control" is true today for an
  uninteresting reason — nothing leaves the laptop at all. Say the interesting
  thing instead: *"when this model is replaced by one we don't control, the
  disclosure is what holds — and nothing else has to change."*

**The target shape** swaps the endpoint and nothing else. Zone 2 already carries
the settings for a remote Reasoning Plane:

| Setting | For |
|---|---|
| `ZONE2_REASONING_PROVIDER` | `google_cloud_run` / `sovereign_hosted` instead of `local` |
| `ZONE2_ZONE3_SERVICE_URL` | Where the remote reasoning service lives |
| `ZONE2_ZONE3_SIGNING_SECRET` | HMAC-SHA256 signing of the `ReasoningContextPackage` |

No capability, disclosure or seed changes when that swap happens. That
invariance is the claim worth making.

---

## Network isolation between demos

The base stack pins its network to `sovereign-zone2`. Each demo overlay
**replaces** that name — the NHS demo runs on `sovereign-zone2-nhs` — so two
demos' identity and runtime stacks cannot accidentally reach each other.

The containerised edge joins the Zone 2 network as an `external` network, which
is why Zone 2 must be up first: it is the side that creates the network.
Cross-project `depends_on` is not possible, so the edge simply tolerates a
not-yet-ready API and retries.

---

## Checking it yourself

```bash
podman ps --format "{{.Names}}\t{{.Status}}"
```

Healthy NHS demo, six running containers (the one-shot jobs have already
exited):

```text
sovereign-zone2-nhs_postgres_1   Up (healthy)
sovereign-zone2-nhs_redis_1      Up (healthy)
sovereign-zone2-nhs_mock-fhir_1  Up
sovereign-zone2-nhs_keycloak_1   Up (healthy)
sovereign-zone2-nhs_worker_1     Up
sovereign-zone2-nhs_api_1        Up (healthy)
```

Confirm the Gateway actually has capabilities — if `nhs-provision` failed, this
is empty and every tool call fails in a confusing way:

```bash
podman exec sovereign-zone2-nhs_postgres_1 \
  psql -U zone2 -d zone2 -c \
  "select event_type, occurred_at from provenance_audit.audit_events order by occurred_at;"
```

See the [local demo runbook](dev/local-demo-runbook.md) for the full lifecycle,
rebuilds and resets.
