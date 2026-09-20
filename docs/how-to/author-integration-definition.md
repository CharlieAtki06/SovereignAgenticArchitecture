---
title: Author an Integration Definition
sidebar_position: 2
---

# Author an Integration Definition

Integration Definitions describe what one Governance Gateway deployment can
serve. They are data compiled into an immutable catalogue generation, not code
selected dynamically by the caller.

## Workflow

1. Choose one authoring adapter: typed Python, canonical JSON, or a seed package.
2. Define capabilities, inputs, purposes, roles, subject handling, connector
   bindings, public output, and projection-private output.
3. Add App presentation and reasoning disclosures only where the capability
   requires them.
4. Compile without mutating the active catalogue and resolve every diagnostic.
5. Review the canonical compiled form, digest, and provenance.
6. Publish, then explicitly activate the revision for one deployment.
7. Verify discovery and at least one governed execution before promoting the
   deployment.

The compiler rejects a reasoning disclosure that attempts to expose a
projection-private field. Activation swaps the process-wide generation
atomically; requests do not choose snapshots.

See [snapshots and checkpoints](../how-it-works/snapshot-lifecycle.md) for the
runtime distinction and the Zone 2 author guide at the pinned evidence revision
for the full grammar.
