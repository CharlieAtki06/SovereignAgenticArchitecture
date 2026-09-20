---
title: Enterprise Intelligence & Resources — Zone 3
sidebar_position: 3
---

# Enterprise Intelligence & Resources — Zone 3

Zone 3 names the enterprise-side trust position. It contains two conceptually
different groups: a **Reasoning Plane** and **Systems of Record**. Neither is
reachable directly from the Edge.

<ArchitectureView viewId="enterprise_resources" mode="embedded" />

## Reasoning Plane

The Reasoning Plane is the large model used by a reasoning capability. Zone 2
treats it as outside the operator-controlled trust position even when an offline
demo runs the model locally. It receives only the invocation inputs and tool
result fields selected by compiled disclosures, within explicit budgets.

`Zone3ReasoningConnector` and its disclosure enforcement are implemented.
Single-shot Ollama use has live proof. Autonomous selection and execution of a
disclosed tool is configured and automated-tested, but still carries a live
proof limitation.

## Systems of Record

Systems of Record include FHIR services, SQL-backed data, document sources, and
third-party APIs. Zone 2 connector adapters translate between their protocols
and internal connector contracts. A multi-source capability may compose several
adapters behind one admitted governed request; it does not reveal those sources
as independent tools to Zone 1.

Continue with [reasoning escalation](../flows/reasoning-escalation.md) or the
[deployment variants](use-cases-and-deployments.md).
