# Migrating a patient self-service front-end to the governed surface

This is a cross-zone note for teams bringing an existing **patient self-service** front-end (e.g. the NHS
Edge App and its fine-tuned model, whose tools looked like `get_appointments()`,
`get_test_results(keyword, date)`, `get_appointment_details(...)`, `book_appointment(date, reason)`) onto the
governed architecture.

## The persona decision

The governed system is built for **multi-user professional (clinician) access**, not patient self-service:
a clinician is an authenticated professional who acts on **many** subjects (patients), bounded by their real
**entitlements** (care relationships). This is the industry-standard shape — verified OIDC identity
(Keycloak) → roles/scopes/purpose (RBAC) → resource-level, relationship-based entitlement (ReBAC). See
[Zone 2 ADR-0019](../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/adr/0019-oidc-identity-entitlement-and-three-axis-governance.md).

The patient tools are a *different persona*: each assumes "**my own** record" (no subject argument). We keep
the clinician model; a patient-facing product is a future addition, not a reshaping of this one.

## What a patient-persona model/UI must change to work here

1. **Every subject-scoped tool takes an explicit `subject_id`.** `get_appointments()` → `appointments.list(subject_id)`;
   `get_appointment_details(...)` → `appointments.get_details(subject_id, appointment_id)`;
   `book_appointment(...)` → `appointments.book(subject_id, date, reason)`. A professional queries *a* patient;
   there is no implicit "me". (A future patient persona would instead bind the subject to the caller's own
   verified `subject_id` claim — deliberately **not** built yet, because a no-subject tool would skip the
   entitlement check entirely.)
2. **Tool names are `domain.action`** (`appointments.list`), not the bare/patient names. The vendor is the
   deployment (one governed Zone 2 per enterprise, selected by `ZONE2_ENABLED_USE_CASE_MODULES`); the model
   must emit these exact ids. See [Zone 2 ADR-0020](../../Sovereign-Agentic-Architecture/SovereignAgenticArchitectureZoneTwo/docs/adr/0020-tool-naming-and-governed-list-output.md).
3. **Purpose is `direct_care`, and it is not a tool argument.** It is derived server-side from the
   authenticated identity (the `purpose` claim); the model never sends it. A `self_service` token is denied
   on these capabilities by the purpose gate.
4. **Login is OIDC, not a bundled credential.** The user authenticates at Keycloak (browser
   Authorization-Code + PKCE — keycloak-js for React, flutter_appauth for Flutter); the token is registered
   once with the edge (`POST /v1/credential`) and only an opaque handle travels thereafter. The CLI's
   `zone1 chat --login` is the reference implementation of exactly this flow.
5. **Writes are human-confirmed.** `appointments.book` is a governed write: it requires an in-band
   confirmation (native MCP elicitation) before it runs, and every decision is audited. The front-end must
   handle the `confirmation.required` prompt.

## What does *not* change

The three-axis governance, entitlement resolution, field-limiting, and audit are all already in place. A
migrated front-end reuses the same identity flow, the same `/v1/credential`→handle seam, and the same MCP
tool surface — it only adjusts its tool names/arguments and its login to the above.

See also: [Keycloak & auth testing](keycloak-auth-testing.md) for the live test users and the allow/deny
matrix.
