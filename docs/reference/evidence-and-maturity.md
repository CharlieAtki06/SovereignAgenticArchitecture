---
title: Evidence and maturity
sidebar_position: 1
---

# Evidence and maturity

Architecture diagrams distinguish two independent questions: whether something
exists, and how strongly it has been verified.

## Maturity

| Value | Meaning |
|---|---|
| `implemented` | The implementation exists at the pinned revision. |
| `prototype` | Working code exists, but it is intentionally narrower than the reference contract or lacks an end-to-end proof. |
| `planned` | A documented intended integration with no implementation in the scoped repositories. |
| `scaffold` | A code placeholder exists without the described behaviour. |
| `external` | A dependency owned outside this architecture. |

## Verification

| Value | Meaning |
|---|---|
| `live` | The claimed path has been observed end to end against real local dependencies. |
| `automated` | Executable tests cover the claim, but no matching live proof is recorded. |
| `source` | Source establishes the implementation shape; executable proof is incomplete. |
| `design` | The claim is architectural intent only. |

The two badges must be read together. `implemented · automated` is not the same
claim as `implemented · live`.

## Evidence references

The architecture model stores logical references such as
`zone1:desktop/src-tauri/src/lib.rs`. The evidence lock maps the repository name
to an immutable commit, and the portal resolves the reference to that revision.
Zone repositories are private, so source links require repository access even
though the root documentation portal is public.

The site build never imports or executes zone code. A separate trusted CI job
checks that referenced files and symbols exist at the pinned revisions.

## Graphify viewers

Graphify viewers expose code-level relationships and are useful after the
architecture view has identified the relevant module. They are generated
evidence, not another source of architecture truth; the LikeC4 model remains
authoritative for the public topology and maturity labels.
