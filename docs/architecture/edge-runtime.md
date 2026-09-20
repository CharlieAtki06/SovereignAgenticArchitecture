---
title: Edge — Zone 1
sidebar_position: 1
---

# Edge — Zone 1

The Edge is the trust and deployment zone on or near the user's device. It is
split deliberately into an **Edge Experience** and an **Edge Runtime** so a
desktop shell, engineering CLI, native mobile prototype, or future embedded
client is not confused with the local orchestration core.

<ArchitectureView viewId="edge_runtime" mode="embedded" />

## Responsibilities

The Edge Runtime owns local model execution, LangGraph orchestration, MCP client
adapters, defensive boundary mapping, Edge Checkpoints, and App hosting. An
Edge Experience owns interaction and platform presentation. Neither owns
enterprise policy, connector execution, or Zone 3 access.

The desktop is the reference interactive implementation. It keeps privileged
host behaviour behind a finite Tauri command surface and renders authorised App
Presentation data in a sandboxed Prefab surface. CLI and Textual TUI paths are
implemented engineering surfaces. The Apple/iOS work is a native prototype, not
a wrapper around the Python runtime.

## Deep seams

- The model adapter returns structured tool intent; it cannot call MCP itself.
- The capability client consumes only the Gateway's published MCP interface.
- App Presentation is excluded from model history and Edge Checkpoints.
- Host-only App actions use a fixed continuation surface and do not create a
  model turn.
- Checkpoint deserialisation has an exact value-object allowlist.

Use the [Edge Experience guide](../how-to/add-edge-experience.md) to add another
client without crossing those seams. Use the Graphify viewer only after the
canonical view has identified the relevant implementation area.
