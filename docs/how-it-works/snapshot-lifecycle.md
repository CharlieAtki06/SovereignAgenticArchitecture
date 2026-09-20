---
title: Snapshots and checkpoints
sidebar_position: 4
---

# Snapshots and checkpoints

“Snapshot” has been used for several unrelated things. This page separates the
two runtime concepts and the visual-test artefact.

## Integration Snapshot — Zone 2

An Integration Definition can be authored as typed Python, canonical JSON, or a
seed package. All authoring paths converge on the same compiler and immutable
compiled definition.

<ArchitectureView viewId="flow_snapshot_activation" mode="embedded" />

The lifecycle is:

1. author definitions and disclosures;
2. compile and validate them without changing the serving catalogue;
3. persist an immutable revision with provenance and digest;
4. publish and activate the intended revision;
5. atomically install one process-wide catalogue generation.

Activation is not per request and is not a routing mechanism between use cases.
A running Governance Gateway serves one configured integration. The current
runtime still defaults to legacy-module registration; active-snapshot mode is an
implemented, explicit deployment choice.

## Edge Checkpoint — Zone 1

An Edge Checkpoint is LangGraph conversation/orchestration state for one Edge
interaction. The runtime can keep it in memory or in the configured SQLite
store. Deserialisation uses an exact allowlist of Zone 1 value objects; it does
not persist credentials, App presentation trees, private connector handles, or
arbitrary pickled objects.

An Integration Snapshot changes what Zone 2 can serve. An Edge Checkpoint lets
Zone 1 resume its own orchestration. They do not share a format or lifecycle.

## Visual-test snapshot

Screenshot baselines and rendered images used by UI tests are visual-test
snapshots only. They have no runtime or governance meaning.
