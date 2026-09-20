---
title: Use cases and deployments
sidebar_position: 4
---

# Use cases and deployments

The architecture supports multiple Edge Experiences and multiple governed use
cases without turning one Gateway process into a use-case router.

<ArchitectureView viewId="deployment_variants" mode="embedded" />

## One runtime, separate deployments

The NHS Care and Northstar Infrastructure demonstrations use the same Governance
Gateway implementation and published MCP semantics. Each deployment selects its
own identity realm, Integration Definition, connector bindings, policy data, and
synthetic dependencies. A running process exposes exactly one configured
integration.

This separation keeps deployment orchestration out of the domain model:

- an Edge deployment policy selects presentation and local runtime settings;
- a demo deployment selects the realm and governed integration;
- an Integration Snapshot selects the catalogue generation served by that
  Gateway instance.

None of those choices is made by a model.

## Multi-source capabilities

A single governed capability may compose multiple approved enterprise
connectors inside Zone 2. The caller still sees one capability, one policy
decision, one governed lifecycle, and one permitted projection.

<ArchitectureView viewId="flow_multi_source_capability" mode="embedded" />

The composition lives behind Zone 2's connector interface; it does not expose
individual enterprise systems to Zone 1.

## Demonstration profiles

- [NHS Care](../demos/nhs-care.md) uses synthetic clinical data and FHIR-shaped
  connectors.
- [Northstar Infrastructure Operations](../demos/northstar-infrastructure-operations.md)
  is a synthetic non-clinical example of the same governance architecture.
- [Deployment topology](../deployment-topology.md) explains which processes
  actually run for the local demonstrations.
