---
title: Build a FastMCP App
sidebar_position: 4
---

# Build a FastMCP App

A FastMCP App adds an authorised human-facing presentation without widening
what either the local model or Reasoning Plane can see.

## Completion path

1. The connector produces its declared maximum result inside Zone 2.
2. Policy obligations and declared output rules produce the Governed Outcome.
3. Zone 2 independently derives a compact Model Observation and an authorised
   App Presentation.
4. Only those projections and opaque lifecycle metadata cross the MCP boundary.
5. Zone 1 puts the observation in model history and mounts the presentation in
   the sandboxed Prefab surface. The presentation tree never enters model state.

<ArchitectureView viewId="flow_app_completion" mode="embedded" />

## Host-only continuation

Interactive App controls use opaque action handles. The host validates the App
instance, revision, origin, input schema, handle, and in-flight claim before
calling the fixed App-action MCP surface. The action is not discoverable by a
model and does not create a LangGraph turn.

<ArchitectureView viewId="flow_app_action" mode="embedded" />

The normative envelope and forbidden fields live only in the
[data-boundary contract](../data-boundary-and-projection-contract.md). Do not
copy that wire shape into an App guide or client implementation.
