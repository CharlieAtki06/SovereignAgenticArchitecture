---
title: Edge Experiences
sidebar_position: 1
---

# Edge Experiences

An Edge Experience is a user-facing client at the Edge — Zone 1 trust position.
It is not synonymous with the Python Edge Runtime: clients can share that
runtime or implement the published Edge/Gateway responsibilities natively.

<ArchitectureView viewId="client_landscape" mode="embedded" />

| Experience | Maturity | Verification | Important limitation |
|---|---|---|---|
| Tauri + React desktop | Implemented | Live | Reference interactive wrapper; sovereign hardening is still incomplete. |
| CLI and Textual TUI | Implemented | Automated | Engineering surfaces, not the primary public experience. |
| Native Apple/iOS | Prototype | Source | Physical-device build exists; a complete app-originated real-Zone-2 round trip is not yet confirmed. |
| Embedded NHS web | Planned | Design | Migration study only; the external web application is not integrated in this workspace. |

The Apple prototype is a separate native implementation using Apple Foundation
Models and a Swift MCP client. It must not be drawn as a wrapper around the
Python runtime. The planned NHS web experience must not be presented as already
using the Gateway.

Every implemented or planned experience preserves the same hard rule: enterprise
capabilities are discovered and invoked through the Governance Gateway's
published MCP interface.
