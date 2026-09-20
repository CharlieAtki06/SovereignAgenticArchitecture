export const architectureViewIds = [
  'landscape',
  'client_landscape',
  'edge_runtime',
  'gateway_runtime',
  'enterprise_resources',
  'deployment_variants',
  'deployment_reuse_overview',
  'deployment_reuse_walkthrough',
  'flow_permitted_path',
  'flow_permitted_path_walkthrough',
  'flow_governed_request_overview',
  'flow_integration_definition_overview',
  'flow_integration_definition_walkthrough',
  'governance_outcomes',
  'flow_projection_overview',
  'flow_reasoning_overview',
  'flow_reasoning_walkthrough',
  'flow_governed_request',
  'flow_confirmation',
  'flow_app_completion',
  'flow_app_action',
  'flow_reasoning_disclosure',
  'flow_multi_source_capability',
  'flow_snapshot_activation',
] as const;

export type ArchitectureViewId = (typeof architectureViewIds)[number];

export type ArchitectureViewMode = 'embedded' | 'atlas' | 'presenter';

export interface ArchitectureViewDescriptor {
  readonly id: ArchitectureViewId;
  readonly label: string;
  readonly group: 'System' | 'Zones' | 'Flows' | 'Deployments';
}

export const architectureViews: readonly ArchitectureViewDescriptor[] = [
  {id: 'landscape', label: 'Three-zone landscape', group: 'System'},
  {id: 'client_landscape', label: 'Edge Experiences', group: 'System'},
  {id: 'edge_runtime', label: 'Edge Runtime', group: 'Zones'},
  {id: 'gateway_runtime', label: 'Governance Gateway', group: 'Zones'},
  {id: 'enterprise_resources', label: 'Enterprise resources', group: 'Zones'},
  {id: 'deployment_variants', label: 'Deployment variants', group: 'Deployments'},
  {id: 'deployment_reuse_overview', label: 'Deployment reuse overview', group: 'Deployments'},
  {
    id: 'deployment_reuse_walkthrough',
    label: 'Deployment reuse walkthrough',
    group: 'Deployments',
  },
  {id: 'flow_permitted_path', label: 'Permitted path', group: 'Flows'},
  {
    id: 'flow_permitted_path_walkthrough',
    label: 'Permitted path walkthrough',
    group: 'Flows',
  },
  {id: 'flow_governed_request_overview', label: 'Governed request overview', group: 'Flows'},
  {
    id: 'flow_integration_definition_overview',
    label: 'Integration Definition overview',
    group: 'Flows',
  },
  {
    id: 'flow_integration_definition_walkthrough',
    label: 'Integration Definition walkthrough',
    group: 'Flows',
  },
  {id: 'governance_outcomes', label: 'Governance outcomes', group: 'Flows'},
  {id: 'flow_projection_overview', label: 'Projection overview', group: 'Flows'},
  {id: 'flow_reasoning_overview', label: 'Reasoning overview', group: 'Flows'},
  {id: 'flow_reasoning_walkthrough', label: 'Reasoning walkthrough', group: 'Flows'},
  {id: 'flow_governed_request', label: 'Governed request', group: 'Flows'},
  {id: 'flow_confirmation', label: 'Confirmation', group: 'Flows'},
  {id: 'flow_app_completion', label: 'App completion', group: 'Flows'},
  {id: 'flow_app_action', label: 'Host-only App action', group: 'Flows'},
  {id: 'flow_reasoning_disclosure', label: 'Reasoning disclosure', group: 'Flows'},
  {id: 'flow_multi_source_capability', label: 'Multi-source capability', group: 'Flows'},
  {id: 'flow_snapshot_activation', label: 'Snapshot activation', group: 'Flows'},
] as const;

export function isArchitectureViewId(value: string): value is ArchitectureViewId {
  return architectureViewIds.includes(value as ArchitectureViewId);
}

export function architectureViewLabel(viewId: ArchitectureViewId): string {
  return architectureViews.find(({id}) => id === viewId)?.label ?? viewId;
}
