---
title: Start here
slug: /
sidebar_position: 1
---

# Sovereign Agentic Architecture

This site explains how user-facing Edge Experiences can use local models and
enterprise capabilities without giving a model an ungoverned route to enterprise
systems.

Choose the shortest path for what you need:

- **Five-minute orientation:** open the [system map](system-map.md), then follow
  [one governed request](flows/governed-request.md).
- **Demo talk-through:** use the full-screen `/demo` route. It reuses the same
  architecture views as the engineering documentation.
- **Engineering reference:** start with the
  [data-boundary contract](data-boundary-and-projection-contract.md) and the
  [cross-zone ADRs](adr/README.md).
- **Code evidence:** use the [maturity and evidence guide](reference/evidence-and-maturity.md)
  before opening the detailed Graphify viewers.

## The invariant

Edge — Zone 1 consumes the Governance Gateway — Zone 2 only through its
published MCP interface. Zone 1 never imports Zone 2, reproduces its policy
logic, or reaches Enterprise Intelligence & Resources — Zone 3 directly.

For App-enabled completions, Zone 1 receives only a compact Model Observation,
an authorised App Presentation, and opaque lifecycle metadata. The complete
Governed Outcome and projection-private routing state remain inside Zone 2.

## Where truth lives

| Question | Authority |
|---|---|
| What do cross-zone terms mean? | [Glossary](glossary.md) |
| How do the zones and contexts relate? | LikeC4 atlas and the [bounded-context map](/project/CONTEXT-MAP) |
| What exactly crosses the MCP boundary? | [Data-boundary contract](data-boundary-and-projection-contract.md) |
| Why was an architectural choice made? | [ADRs](adr/README.md) |
| Is something implemented or only planned? | LikeC4 maturity metadata backed by pinned evidence |
| What does the code contain in detail? | Zone source at the pinned revisions and the Graphify viewers |
