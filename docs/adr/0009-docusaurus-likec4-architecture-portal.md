# ADR-0009: Docusaurus and LikeC4 form the architecture portal

## Status

Accepted.

## Context

The architecture needs to serve two audiences from the same facts: a short,
visual demo and a complete engineering reference. Hand-authored diagrams had
begun to duplicate topology and implementation-status claims across Markdown,
while code graphs were too detailed to act as the public system map.

The zone repositories are private and independently versioned. A public portal
must build without cloning or executing them, while still making every visible
implementation claim traceable to an immutable revision.

## Decision

The root repository uses:

- Docusaurus 3 as the static documentation, atlas, and presenter shell;
- one LikeC4 model under `architecture/` as the authority for topology, flows,
  maturity, verification, and evidence references;
- `architecture/evidence.lock.json` to pin private zone evidence revisions;
- Graphify viewers as secondary code evidence, never as architecture authority;
- Mermaid only for small lifecycle/state diagrams where topology is not the subject.

The atlas, presenter, and Markdown pages address stable LikeC4 view IDs through
one `ArchitectureView` module with the interface `{viewId, mode, step?}`. The
optional step is a one-based dynamic-diagram walkthrough step, never a presenter
scene number. Callers do not import generated components directly. Generated
React output is untracked, recreated before checks and builds, rendered
client-side, and configured not to inject CDN fonts.

The portal exposes two journeys grounded in that one model:

- `/demo` is a story-first novice presentation. It moves from the promise of a
  local small model, through the enterprise-access tension and design question,
  to the governed architecture and a live NHS proof. Text-only scenes may own
  narrative framing, ordering, speaker cues, and visual emphasis. Whenever a
  scene explains topology, a system relationship, a constraint, or a flow, it
  uses a canonical LikeC4 view and its descriptions, relationships,
  `constraint_*` entries, and Gateway `outcome_*` entries.
- `/atlas` is the engineering explorer. It exposes owner, maturity,
  verification, limitations, and immutable evidence references.

Presenter scenes own only order, scenario framing, speaker cues, stable hashes,
and whether the scene shows narrative typography, a canonical view, or a
sanitised Zone 1 visual-harness capture. Narrative scenes must not define
topology, payload contracts, maturity, verification, or implementation facts.
There is no presenter-owned node-copy or topology map. Element colour
communicates trust/deployment-zone identity only; maturity and verification are
separate textual badges.

The public site can build with no private checkout. Trusted validation resolves
evidence paths and symbols at the locked commits; changing a pin requires an
intentional documentation change. The Zone 1 capture records its provenance
through the evidence lock without introducing a runtime or source dependency.

## Consequences

- Demo and reference journeys cannot silently drift into different topologies.
- The novice story can explain why the architecture exists before naming its
  components, without creating another architectural source of truth.
- Novice language and engineering evidence can differ in presentation without
  becoming separate sources of architectural truth.
- Maturity and verification remain separate, visible status dimensions.
- Public builds contain documentation and pre-generated code explorers but no
  private zone source or runtime dependency.
- Authors must update model metadata and evidence whenever an implementation
  status claim changes.
- Public elements need concise descriptions and canonical constraints so the
  novice projection remains complete without a second copy catalogue.
- The generated LikeC4 React bundle is a build product and must not be edited or committed.

## Rejected alternatives

- **A separate PowerPoint or Slidev deck:** it would duplicate ordering and architecture facts.
- **Custom React Flow diagrams:** they would create a second topology model and bespoke maintenance burden.
- **Presenter-owned node explanations:** a second Role/Receives/Returns/Cannot-do
  catalogue would drift from the model even if it reused the same view IDs.
- **Structurizr beside LikeC4:** two architecture-as-code authorities would violate SPOT.
- **Graphify as the public map:** code-level graphs are valuable evidence but do not express audience language, trust boundaries, or deliberate abstraction.
