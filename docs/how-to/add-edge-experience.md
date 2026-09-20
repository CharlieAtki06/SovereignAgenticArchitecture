---
title: Add an Edge Experience
sidebar_position: 1
---

# Add an Edge Experience

An Edge Experience owns presentation, local session interaction, and the
client-side adapters needed by its platform. It does not own governance policy
or enterprise connectors.

## Required interface

1. Authenticate through the deployment's supported identity flow without
   placing credentials in capability parameters or model context.
2. Discover the capabilities published by the Governance Gateway.
3. Expose only the permitted model-visible schemas to the local model;
4. validate structured model output before invoking MCP;
5. relay native elicitation when Zone 2 requests human confirmation;
6. keep App Presentation data out of model history;
7. route host-only App actions through the fixed App-action surface, never back
   through capability discovery.

Use the existing desktop as the reference implementation and the Apple package
as a deliberately narrower native prototype. Do not copy Zone 2 policy logic or
import Zone 2 source to make a client appear self-contained.

## Definition of done

- The client has no direct Zone 3 or enterprise-system endpoint.
- An allow, deny, and confirmation path are demonstrated against the same Zone 2
  deployment.
- App-enabled results reject undeclared envelope fields.
- Credentials and projection-private values cannot enter model or App state.
- Its maturity and evidence are updated in the canonical architecture model.
