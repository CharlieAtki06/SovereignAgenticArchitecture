---
title: One Zone 2, several tenants
sidebar_position: 5
---

# One Zone 2, several tenants

One Governance Gateway (Zone 2) serves several organisations from one process, one `/mcp` URL and
one Keycloak realm. The user installs one generic desktop (Zone 1). The sign-in token says which
organisation they belong to, and that decides which tools Zone 2 lists and which brand the desktop
shows. This page is the single description of how the pieces fit. The other documents link here and
do not repeat it.

Everything stays inside the trust boundary. Brand content never crosses the seam: only an
identifier does.

## What happens at sign-in

1. The desktop starts with the neutral brand and the one issuer it was built with.
2. The user signs in at Keycloak in the system browser. Keycloak issues an access token whose
   `organization` claim names the user's organisation and carries two organisation attributes:
   the organisation id and a `brand_id`.
3. The desktop host reads `brand_id` from the token without verifying it. It is presentation only.
   If it is a valid slug it is passed to the renderer, which looks it up in the brands bundled
   with the app. An unknown or absent id keeps the neutral brand.
4. The desktop calls Zone 2 with the same token. Zone 2 verifies it, takes the organisation from
   the verified claim, and lists only that tenant's tools and prompts.
5. Every tool also carries its own `required_organisation_id` gate, so calling another tenant's
   tool by name is refused.

## Single point of truth

| Fact | Owner | Crosses the seam as |
|---|---|---|
| Brand content: theme, copy, logo | Zone 1, `desktop/brands/<id>/` | never |
| Which organisation uses which brand | Keycloak organisation attribute `brand_id` | a claim |
| Which organisations exist and who is in them | Zone 2 realm file `keycloak/realms/sovereign-demo.json` | a token |
| Which tenants a Zone 2 serves | Zone 2 profile `examples/profiles/sovereign-demo.env` | never |
| What each tenant can do | its seed pair in `examples/integration-definition-seeds/` | `tools/list` |
| Which claim names the organisation | one function, `organisation_from_claims` in `shared_kernel/auth.py` | none |
| What the UI may enable | Zone 1 deployment policy `allowedUiFeatures` | never from a token |
| Demo user passwords | one realm variable, `DEMO_USER_PASSWORD` | none |

The infrastructure repository only names the profile and the realm. It does not restate tenants.

## Zone 2: the tenant registry

A tenant is an `(organisation_id, integration_id)` pair. `InMemoryRuntimeTenantRegistry`
(`integration_runtime/tenant_registry.py`) holds one `RuntimeTenant` per organisation, built once
at startup from the profile's `ZONE2_RUNTIME_TENANTS`. It is declarative, not filled by decorators,
so construction order never decides which implementation is installed. Adding a tenant needs a
restart.

Each tenant owns its adapter bundles, its installer and its own `AtomicRuntimeCatalogueManager`
(the manager is reused unchanged). Bundles cannot be merged into one set: the platform manifest
fingerprint covers the whole bundle set and every snapshot pins it, and only one subject
relationship resolver is allowed. Nothing about "complete set, atomic swap" changes. It now applies
per tenant.

| Concern | Where |
|---|---|
| Tool and prompt listing per caller | `api/mcp/tenant_provider.py`, `TenantRoutingProvider` |
| Request capture and exact-generation lookup | `integration_runtime/tenant_request_catalogue.py` |
| Subject and App workflow routing | `integration_runtime/tenant_routers.py` |
| Verifying live snapshot references | `integration_runtime/tenant_references.py` |
| Building one tenant | `integration_runtime/tenant_builder.py` |
| Settings and validation | `bootstrap/settings.py`: `RuntimeTenantSettings`, `ZONE2_RUNTIME_TENANTS` |

### How the organisation is read

`organisation_from_claims` reads the `organization` claim, which Keycloak emits as an object with
one key per organisation. One key names the tenant. The older `organisation_id` and `org` claims
remain as fallbacks. Behaviour is fail-closed:

| Claim | Listing | Execution |
|---|---|---|
| One organisation | that tenant's tools | that tenant |
| Unknown organisation | empty list | refused |
| Several organisations | empty list | refused |
| Absent | empty list | the deployment default, only when there is exactly one tenant |

### Isolation

Isolation rests on three checks in sequence: the verified claim picks the tenant, that tenant's own
catalogue is the only source of tools, and each tool keeps its organisation gate. A request is
stored with its `organisation_id`, so the worker and any later continuation use the owning tenant,
not the current caller. Snapshots are keyed by digest alone, so two organisations cannot share one
integration definition: each seed pins its `organisation_id` inside the hashed bytes. The
`nhs-trust` and `northstar-infrastructure` seeds are separate files for that reason.

`/health/ready` reports `source_mode`, `state` and a `tenants` object, with `state`,
`configured_integration`, the local and committed snapshot digests and the pointer version for each
tenant. The process is ready only when every tenant has converged.

## Keycloak

One realm, `sovereign-demo`, one issuer. Each tenant is a Keycloak Organization whose alias is the
organisation id. The `zone1-edge` client's Organization Membership mapper adds the organisation id
and attributes, so the claim looks like this:

```json
{"organization": {"nhs-trust": {"id": "…", "organisation_id": ["nhs-trust"], "brand_id": ["nhs"]}}}
```

A realm file that declares `clientScopes` replaces Keycloak's built-in scopes, so the file carries
the standard ones itself (including `roles`, `offline_access` and `organization`). A contract test
fixes this. Details: Zone 2 `docs/dev/keycloak.md`.

## Zone 1: the generic desktop

The host reads `brand_id` and validates only its shape. The renderer's bundled brand loader is the
allowlist, so a token can never introduce a brand, and `allowedUiFeatures` never changes from a
token. Sign-out clears the session, revokes the refresh token at Keycloak, empties the user-scoped
query cache and returns to the neutral sign-in page. The next sign-in forces credentials
(`prompt=login`), so switching organisation or user is one sign-out. See Zone 1 ADR-0035 and
ADR-0036.

## Users

Passwords are not stored in the repository. Every demo user in `sovereign-demo.json` has the
password `${DEMO_USER_PASSWORD}`, substituted when Keycloak imports the realm.

| Environment | Where the value comes from |
|---|---|
| Local | `DEMO_USER_PASSWORD`, default `demo` |
| Google Cloud | the Secret Manager secret `sov-demo-user-password`; print it with `xc secret demo` |

| User | Tenant | Brand and tools |
|---|---|---|
| `clinician-a`, `clinician-b` | `nhs-trust` | NHS Care and the NHS tools |
| `operator-a`, `operator-north` | `northstar-infrastructure` | Northstar and the maintenance tools |
| `patient-x` | `nhs-trust` | NHS Care, no tools (every NHS tool needs the `direct_care` purpose) |

A contract test keeps the older single-tenant realm files from drifting from this one.

## Reasoning

`assistant.ask_reasoning` is an NHS tool backed by the Zone 3 connector. It fails with
`zone3_disabled` unless Zone 2 has a reasoning provider. The Zone 1 desktop's own model is separate
and stays on local Ollama.

The reasoning step asks the model for structured output. Ollama's MLX runner (the plain
`gemma4:e4b` build on Apple Silicon) answers 501 to that, so the local default is the GGUF build,
which runs on llama.cpp.

| Where | Provider | Setting |
|---|---|---|
| Local compose | local Ollama on the host | `ZONE2_REASONING_PROVIDER=local`, model `gemma4:e4b-it-q4_K_M` (default in `compose.demos/sovereign-demo.yml`) |
| Google Cloud | Gemini API with an API key | `TF_VAR_reasoning_model` and `TF_VAR_gemini_api_key`; off when no model is named |

The key is the one credential the stack cannot generate: a person creates it in Google AI Studio.
It is written once into Secret Manager as `sov-gemini-api-key` and read by Zone 2 as
`ZONE2_REASONING_API_KEY`. Zone 2 refuses to start the `google_ai` provider without a model and a
key. Provider reference: Zone 2 `docs/configuration.md`.

## Run it

| Task | Command |
|---|---|
| Both tenants and the generic desktop | `make desktop-up-sovereign` (root) |
| Stack only | `make demo-up-sovereign` |
| Stop, or wipe and restart | `make desktop-down-sovereign`, `make desktop-reset-sovereign` |
| Deploy | Zone 2 `make release`, then `xc deploy` in the infrastructure repository |

Only one demo can use the standard local ports at a time. The full local procedure is in
[the local demo runbook](../dev/local-demo-runbook.md); deployment is in the infrastructure
repository's `docs/components/release.md`.

## Add a tenant

All of it is in Zone 2, then a release:

1. A seed pair named for the organisation id: `<organisation_id>.seed.json` and
   `<organisation_id>.provisioning.json`, with that id inside the envelope.
2. An entry in the profile's `ZONE2_RUNTIME_TENANTS`.
3. A Keycloak organisation with that alias and a `brand_id` attribute, and its users.
4. If it has a new brand, the brand in Zone 1 `desktop/brands/<id>/`. The desktop needs a new build
   for that.

## Limits

- Tenants are fixed at startup, and a user belongs to one organisation. A user in several
  organisations is refused rather than guessed at.
- One integration per organisation for now. The tenant key already allows more.
- The instance is capped at one on Google Cloud, and its databases are throwaway.
- Verified locally: two tenants converging on real PostgreSQL, different MCP tool lists per
  organisation, refresh-token revocation. **Not yet verified:** two tenants on Cloud Run, the
  Keycloak password substitution in the deployed image, the Gemini provider against Google, and
  the desktop's brand switch and sign-out in the rebuilt app.

## Decisions

Zone 2 ADR-0035 (tenant registry), Zone 1 ADR-0035 (brand from the token) and ADR-0036
(sign-out), infrastructure ADR 0010 (one issuer, many tenants). Each lives in its own repository.
