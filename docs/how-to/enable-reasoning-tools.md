---
title: Enable bounded reasoning tools
sidebar_position: 3
---

# Enable bounded reasoning tools

Registering a capability does not make it visible to the Reasoning Plane. Tool
access is an explicit, versioned disclosure compiled into the active catalogue.

## Workflow

1. Define the outer reasoning capability and its Invocation Disclosure.
2. Mark each input as disclosed, transformed, retained server-side, or absent.
3. Reference only the exact Tool Disclosure versions the reasoning model may
   use through `permitted_tools`.
4. Bind retained context, such as the subject, into connector inputs that the
   model cannot choose.
5. Select public result fields and installed transformations explicitly.
6. Set model-round, tool-call, per-result, cumulative-result, invocation-size,
   response-size, and deadline budgets.
7. Compile the definition and run disclosure canaries against the real compiled
   snapshot.

Inside the reasoning loop, disclosed tools call registered Zone 2 connectors
directly. They do not re-enter MCP/HTTP and do not receive a new policy decision
for each subcall. Their authority is narrower than the outer admitted request
because the compiled disclosure and budgets constrain the call.

<ArchitectureView viewId="flow_reasoning_disclosure" mode="embedded" />

The current connector and disclosure enforcement are implemented. Single-shot
Ollama execution has live evidence; autonomous live model selection and use of
the NHS disclosed tool remains a pending proof and must retain that limitation
badge.
