# Contributing

The system spans three independently versioned repositories. Make changes in
the repository that owns the concern; do not create source-level coupling to
make cross-repository work easier.

| Repository | Change here when |
|---|---|
| Root documentation envelope | A term, context relationship, cross-zone contract, decision, architecture view, portal page, or root command changes |
| Edge — Zone 1 | An Edge Experience, local orchestration, local model, MCP client, checkpoint, or App host changes |
| Governance Gateway — Zone 2 | Authentication, policy, audit, Integration Definitions, connectors, projections, or the MCP server changes |

## Work locally

Run `./setup.sh` once from this repository. It creates the sibling checkout
layout used by the workspace and evidence tooling. The script leaves existing
checkouts untouched.

For documentation work:

```bash
make docs-install
make docs-dev
make docs-check
```

`make docs-build` does not need either private zone checkout. `make
docs-evidence` resolves every LikeC4 evidence reference at the revisions pinned
in `architecture/evidence.lock.json` and therefore needs both repositories.

## Change the correct source of truth

| Concern | Change |
|---|---|
| Cross-zone term | `docs/glossary.md` |
| Bounded-context ownership or relationship | `CONTEXT-MAP.md` |
| Topology, flow, status, or evidence badge | `architecture/` |
| Exact cross-zone payload meaning | `docs/data-boundary-and-projection-contract.md` |
| Cross-zone decision | `docs/adr/` |
| Operational command | `Makefile` |
| Zone behavior | The owning zone repository |

Explanatory pages should link to these authorities instead of copying their
definitions, payloads, or commands.

## The MCP boundary

Edge reaches the Governance Gateway only through the published MCP interface.
It must not import Gateway code, call internal Python functions, reproduce
policy, or reach Enterprise Intelligence & Resources directly.

An MCP interface change requires coordinated pull requests. Update and merge
the Zone 2 producer first, then update the Zone 1 consumer. Include producer
and consumer contract tests and update the normative boundary contract when
payload semantics change.

## Architecture changes

Every public LikeC4 element and relationship needs `owner`, `maturity`,
`verification`, and at least one `evidence` reference. Keep maturity and proof
independent. A prototype can be source-verified; an implemented path can still
lack live proof.

Pin changes are intentional documentation changes. Never update an evidence
pin automatically. Regenerate the Graphify viewers from those same revisions
after accepting a new pin.

## Pull requests

- Run `make docs-check` for root changes.
- Run `make docs-evidence` in a trusted environment when architecture evidence changes.
- Link coordinated zone pull requests and state their merge order.
- Put zone-internal ADRs in the owning zone; reserve root ADRs for cross-zone decisions.
- Mark plans, research, and audits as non-normative before publishing them.
