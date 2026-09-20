---
title: Confirmation and elicitation
sidebar_position: 2
---

# Confirmation and elicitation

Confirmation is a branch of the same governed request, not a second capability
or a client-side policy decision.

<ArchitectureView viewId="flow_confirmation" mode="embedded" />

When deterministic policy requires confirmation, Zone 2 records the pending
state and returns native MCP elicitation. The Edge Experience presents that
request to the person and relays the decision. Zone 2 verifies the continuation
against the same request lifecycle before execution can resume.

The local model cannot manufacture an approval, and Zone 1 does not implement a
parallel confirmation protocol. A denial or expired continuation remains a
terminal, audited outcome without connector execution.

For interactive controls inside an already rendered App, use the separate
[host-only App action](../fastmcp-apps-and-prefab-overlay.md) path. App actions
are not confirmation and are never model-discoverable tools.
