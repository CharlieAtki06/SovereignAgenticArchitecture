# Cross-Zone Architecture Decision Records

These ADRs govern decisions that span both Zone 1 and Zone 2, or that define the boundary between them. Zone-internal decisions live in each zone's own `docs/adr/` directory.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-separate-repositories-per-zone.md) | Separate repositories per zone | Accepted |
| [0002](0002-mcp-as-zone-boundary-transport.md) | MCP as the Zone 1 → Zone 2 transport boundary | Accepted |
| [0003](0003-mcp-tool-result-is-the-typed-zone-boundary-contract.md) | The MCP tool-result is the typed Zone 1 ↔ Zone 2 contract | Accepted |
| [0004](0004-native-elicitation-replaces-confirmation-protocol-and-discriminator.md) | Native MCP elicitation replaces the hand-rolled confirmation protocol and the governed-capability discriminator | Accepted |
| [0005](0005-demo-profiles-are-deployment-orchestration.md) | Demo profiles are deployment orchestration, not a runtime seam | Accepted |
| [0006](0006-model-observation-and-app-presentation-are-independent-projections.md) | Model Observation and App Presentation are independent projections | Accepted |
| [0007](0007-host-only-governed-app-actions.md) | Host-only governed App actions use a separate MCP surface | Accepted |
| [0008](0008-app-completions-carry-audience-projections-not-governed-results.md) | App completions carry audience projections, not governed results | Accepted |
