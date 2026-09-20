#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const architectureRoot = join(repoRoot, 'architecture');
const modelRoot = join(architectureRoot, 'model');
const viewsRoot = join(architectureRoot, 'views');
const portalViewRegistry = join(repoRoot, 'portal', 'src', 'architecture', 'views.ts');

const NOVICE_VIEWS = new Set([
  'landscape',
  'deployment_reuse_overview',
  'flow_permitted_path',
  'flow_governed_request_overview',
  'flow_integration_definition_overview',
  'governance_outcomes',
  'flow_projection_overview',
  'flow_reasoning_overview',
]);

const OWNERS = new Set(['root', 'zone1', 'zone2', 'external']);
const MATURITY = new Set(['implemented', 'prototype', 'planned', 'scaffold', 'external']);
const VERIFICATION = new Set(['live', 'automated', 'source', 'design']);
const EVIDENCE_PATTERN = /^(root|zone1|zone2|external):[^\s#]+(?:#[^\s]+)?$/;

const diagnostics = [];

function error(file, line, message) {
  diagnostics.push(`${relative(repoRoot, file)}:${line}: ${message}`);
}

function lineAt(text, offset) {
  return text.slice(0, offset).split('\n').length;
}

async function filesBelow(directory, suffix) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await filesBelow(absolute, suffix));
    else if (entry.name.endsWith(suffix)) output.push(absolute);
  }
  return output.sort();
}

function matchingBrace(text, openAt) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = openAt; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === "'") quoted = false;
      continue;
    }
    if (character === "'") {
      quoted = true;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function declarationBlock(text, match) {
  const openAt = text.indexOf('{', match.index + match[0].length - 1);
  if (openAt < 0) return null;
  const closeAt = matchingBrace(text, openAt);
  if (closeAt < 0) return null;
  return text.slice(openAt + 1, closeAt);
}

function metadataFrom(block) {
  if (!block) return null;
  const match = /\bmetadata\s*\{/m.exec(block);
  if (!match) return null;
  const openAt = block.indexOf('{', match.index);
  const closeAt = matchingBrace(block, openAt);
  if (closeAt < 0) return null;
  const body = block.slice(openAt + 1, closeAt);
  const result = {};
  for (const entry of body.matchAll(/^\s*([A-Za-z][\w-]*)\s+'((?:\\.|[^'])*)'\s*$/gm)) {
    const [, key, value] = entry;
    if (result[key] === undefined) result[key] = value;
    else if (Array.isArray(result[key])) result[key].push(value);
    else result[key] = [result[key], value];
  }
  return result;
}

function validateMetadata(file, text, match, kind) {
  const line = lineAt(text, match.index);
  const metadata = metadataFrom(declarationBlock(text, match));
  if (!metadata) {
    error(file, line, `${kind} is public but has no metadata block`);
    return null;
  }

  for (const key of ['owner', 'maturity', 'verification', 'evidence']) {
    if (!metadata[key]) error(file, line, `${kind} metadata is missing '${key}'`);
  }
  if (metadata.owner && !OWNERS.has(metadata.owner)) {
    error(file, line, `${kind} owner '${metadata.owner}' is not one of ${[...OWNERS].join(', ')}`);
  }
  if (metadata.maturity && !MATURITY.has(metadata.maturity)) {
    error(file, line, `${kind} maturity '${metadata.maturity}' is not one of ${[...MATURITY].join(', ')}`);
  }
  if (metadata.verification && !VERIFICATION.has(metadata.verification)) {
    error(file, line, `${kind} verification '${metadata.verification}' is not one of ${[...VERIFICATION].join(', ')}`);
  }
  const evidence = Array.isArray(metadata.evidence) ? metadata.evidence : [metadata.evidence].filter(Boolean);
  for (const reference of evidence) {
    if (!EVIDENCE_PATTERN.test(reference)) {
      error(file, line, `${kind} evidence '${reference}' must use repo:path[#symbol]`);
    }
  }
  if (['planned', 'prototype'].includes(metadata.maturity) && metadata.verification === 'live') {
    error(file, line, `${kind} cannot be both '${metadata.maturity}' and live-verified`);
  }
  return metadata;
}

const specificationFile = join(architectureRoot, 'specification.c4');
const specificationText = await readFile(specificationFile, 'utf8');
if (!/\belement\s+area\b/.test(specificationText) || /\belement\s+context\b/.test(specificationText)) {
  diagnostics.push("architecture/specification.c4: architecture grouping kind must be 'area', not 'context'");
}
if (/\btag\s+(implemented|prototype|planned|scaffold|external)\b/.test(specificationText)) {
  diagnostics.push('architecture/specification.c4: maturity must not control diagram colour');
}
for (const tag of ['zone_edge', 'zone_gateway', 'zone_enterprise']) {
  if (!new RegExp(`\\btag\\s+${tag}\\b`).test(specificationText)) {
    diagnostics.push(`architecture/specification.c4: missing zone identity tag '${tag}'`);
  }
  if (!new RegExp(`style\\s+element\\.tag\\s*=\\s*#${tag}\\b`).test(specificationText)) {
    diagnostics.push(`architecture/specification.c4: zone identity tag '${tag}' has no canonical element style`);
  }
}

const modelFiles = await filesBelow(modelRoot, '.c4');
const relations = [];
const elements = [];

for (const file of modelFiles) {
  const text = await readFile(file, 'utf8');
  if (/\belement\s+context\b|=\s*context\b/.test(text)) {
    error(file, 1, "architecture grouping kind must be 'area', not the DDD-overloaded term 'context'");
  }
  const modelFile = basename(file);
  const zoneTag = modelFile === 'edge.c4'
    ? 'zone_edge'
    : modelFile === 'gateway.c4'
      ? 'zone_gateway'
      : modelFile === 'enterprise.c4'
        ? 'zone_enterprise'
        : null;
  const elementPattern = /^\s*([A-Za-z][\w]*)\s*=\s*(zone|area|component|experience|resource|deployment)\s+'((?:\\.|[^'])*)'(?:\s+'((?:\\.|[^'])*)')?[^\n{]*\{/gm;
  for (const match of text.matchAll(elementPattern)) {
    const block = declarationBlock(text, match);
    const metadata = validateMetadata(file, text, match, `element '${match[1]}'`);
    if (!match[4]?.trim()) {
      error(file, lineAt(text, match.index), `element '${match[1]}' must have a concise public description`);
    }
    if (!Object.keys(metadata ?? {}).some((key) => key.startsWith('constraint_'))) {
      error(file, lineAt(text, match.index), `element '${match[1]}' must declare at least one constraint_* entry`);
    }
    const ownPreamble = block?.slice(0, block.indexOf('metadata')) ?? '';
    if (zoneTag && !new RegExp(`(^|\\s)#${zoneTag}(?:\\s|$)`).test(ownPreamble)) {
      error(file, lineAt(text, match.index), `element '${match[1]}' must carry the #${zoneTag} identity tag`);
    }
    elements.push({ file, id: match[1], title: match[3], description: match[4], metadata });
  }

  const relationPattern = /^\s*([A-Za-z][\w.]*)\s*->\s*([A-Za-z][\w.]*)\s+'([^']+)'\s*\{/gm;
  for (const match of text.matchAll(relationPattern)) {
    const block = declarationBlock(text, match);
    const metadata = validateMetadata(file, text, match, `relationship '${match[1]} -> ${match[2]}'`);
    relations.push({ file, line: lineAt(text, match.index), source: match[1], target: match[2], label: match[3], block, metadata });
  }
}

for (const relation of relations) {
  if ((relation.source === 'edge' || relation.source.startsWith('edge.'))
    && (relation.target === 'enterprise' || relation.target.startsWith('enterprise.'))) {
    error(relation.file, relation.line, 'Edge must never connect directly to Enterprise resources');
  }
  if ((relation.source === 'edge' || relation.source.startsWith('edge.'))
    && (relation.target === 'gateway' || relation.target.startsWith('gateway.'))) {
    if (!/\btechnology\s+'MCP'/.test(relation.block ?? '')) {
      error(relation.file, relation.line, 'every Edge-to-Gateway relationship must declare MCP technology');
    }
    const isZoneSummary = relation.source === 'edge'
      && relation.target === 'gateway'
      && relation.label.toLowerCase().includes('published interface');
    const targetsPublishedEndpoint = relation.source === 'edge.runtime.mcp_client'
      && (relation.target === 'gateway.ingress.mcp_server'
        || relation.target.endsWith('.mcp_endpoint'));
    if (!isZoneSummary && !targetsPublishedEndpoint) {
      error(
        relation.file,
        relation.line,
        'Edge may target only the Gateway published MCP server or a deployment published MCP endpoint',
      );
    }
  }
}

function requireRelation(source, target, labelFragment, invariant) {
  const found = relations.some((relation) => relation.source === source
    && relation.target === target
    && relation.label.toLowerCase().includes(labelFragment.toLowerCase()));
  if (!found) diagnostics.push(`architecture invariant: ${invariant}`);
}

requireRelation(
  'edge',
  'gateway',
  'published interface',
  'the novice permitted path must show Edge reaching the Gateway through its published interface',
);
requireRelation(
  'gateway',
  'enterprise',
  'Connector Boundary',
  'the novice permitted path must show the Gateway reaching enterprise resources through its connector boundary',
);
requireRelation(
  'edge.runtime.app_host',
  'edge.runtime.mcp_client',
  'host-only',
  'App actions must be host-only continuations through the MCP client',
);
if (relations.some((relation) => relation.source.includes('local_model') && relation.target.includes('app_host'))) {
  diagnostics.push('architecture invariant: host-only App actions must not be visible to the local model');
}

requireRelation(
  'gateway.projection.projector',
  'edge.runtime.mcp_client',
  'only Model Observation, authorised App Presentation, and opaque lifecycle metadata',
  'App completion may cross the boundary only as audience projections and opaque lifecycle metadata',
);
requireRelation(
  'gateway.execution.reasoning_connector',
  'gateway.execution.connector_boundary',
  'no fresh policy decision',
  'reasoning tool subcalls must use disclosed connectors under the outer admission without fresh policy',
);
requireRelation(
  'gateway.deployments.nhs_gateway',
  'gateway.definitions.active_snapshot',
  'exactly one NHS snapshot',
  'the NHS Gateway deployment must activate exactly one NHS Integration Snapshot',
);
requireRelation(
  'gateway.deployments.northstar_gateway',
  'gateway.definitions.active_snapshot',
  'exactly one Northstar snapshot',
  'the Northstar Gateway deployment must activate exactly one Northstar Integration Snapshot',
);
requireRelation(
  'gateway.governance.policy',
  'gateway.governance.denied_outcome',
  'before connector execution',
  'the deny outcome must stop before connector execution',
);
requireRelation(
  'gateway.governance.policy',
  'gateway.governance.audit',
  'every allow, confirmation, or deny decision',
  'every policy outcome must be auditable',
);
requireRelation(
  'edge.runtime.mcp_client',
  'gateway.deployments.nhs_gateway.mcp_endpoint',
  'published MCP endpoint',
  'the NHS deployment must be reached only through its published MCP endpoint',
);
requireRelation(
  'edge.runtime.mcp_client',
  'gateway.deployments.northstar_gateway.mcp_endpoint',
  'published MCP endpoint',
  'the Northstar deployment must be reached only through its published MCP endpoint',
);
requireRelation(
  'gateway.deployments.nhs_gateway.governed_runtime',
  'enterprise',
  'Enterprise Connector Boundary',
  'the NHS Gateway deployment must be the governed route to Enterprise',
);
requireRelation(
  'gateway.deployments.northstar_gateway.governed_runtime',
  'enterprise',
  'Enterprise Connector Boundary',
  'the Northstar Gateway deployment must be the governed route to Enterprise',
);

const gatewayDefinition = elements.find((element) => element.id === 'gateway');
if (!gatewayDefinition?.title.includes('Governance Gateway')) {
  diagnostics.push('architecture invariant: Zone 2 must be named Governance Gateway, not a reasoning agent');
}

const policyDefinition = elements.find((element) => element.id === 'policy');
for (const outcome of ['outcome_allow', 'outcome_confirm', 'outcome_deny', 'outcome_audit']) {
  if (!policyDefinition?.metadata?.[outcome]) {
    diagnostics.push(`architecture invariant: Gateway policy must declare '${outcome}' as canonical presenter metadata`);
  }
}

const viewFiles = await filesBelow(viewsRoot, '.c4');
const viewIds = new Set();
const viewDescriptions = new Map();
const viewDefinitions = new Map();
for (const file of viewFiles) {
  const text = await readFile(file, 'utf8');
  if (!/\bglobal\s+style\s+zone_identity\b/.test(text)) {
    error(file, 1, "views must apply the canonical 'zone_identity' style group");
  }
  for (const match of text.matchAll(/^\s*(?:dynamic\s+)?view\s+([A-Za-z][\w]*)\b/gm)) {
    const id = match[1];
    if (viewIds.has(id)) error(file, lineAt(text, match.index), `duplicate architecture view '${id}'`);
    viewIds.add(id);
    const block = declarationBlock(text, match);
    viewDescriptions.set(id, /\bdescription\s+'((?:\\.|[^'])*)'/m.exec(block ?? '')?.[1]?.trim());
    viewDefinitions.set(id, {
      block: block ?? '',
      dynamic: /^\s*dynamic\s+view\b/.test(match[0]),
    });
  }
}

for (const noviceView of NOVICE_VIEWS) {
  if (!viewIds.has(noviceView)) {
    diagnostics.push(`architecture view: required novice view '${noviceView}' is missing`);
  } else if (!viewDescriptions.get(noviceView)) {
    diagnostics.push(`architecture view: novice view '${noviceView}' must declare a canonical description`);
  }
}

const permittedPath = viewDefinitions.get('flow_permitted_path');
if (permittedPath) {
  const requiredElements = [
    'edge',
    'edge.experiences.desktop',
    'edge.runtime.ui_adapter',
    'edge.runtime.orchestration',
    'edge.runtime.local_model',
    'edge.runtime.mcp_client',
    'gateway',
    'gateway.ingress.mcp_server',
    'gateway.ingress.authentication',
    'gateway.governance',
    'gateway.definitions.active_snapshot',
    'gateway.definitions.catalogue',
    'gateway.execution.orchestrator',
    'gateway.execution.connector_boundary',
    'gateway.execution.reasoning_connector',
    'enterprise',
    'enterprise.reasoning',
    'enterprise.reasoning.llm',
    'enterprise.records',
    'enterprise.records.fhir',
    'enterprise.records.sql',
    'enterprise.records.documents',
  ];
  for (const elementId of requiredElements) {
    const escapedId = elementId.replaceAll('.', '\\.');
    if (!new RegExp(`^\\s*include\\s+${escapedId}\\s*$`, 'm').test(permittedPath.block)) {
      diagnostics.push(
        `architecture view: 'flow_permitted_path' must include '${elementId}' in the novice zone detail`,
      );
    }
  }
}

const requestOverview = viewDefinitions.get('flow_governed_request_overview');
if (requestOverview && !requestOverview.dynamic) {
  diagnostics.push("architecture view: 'flow_governed_request_overview' must be a six-step dynamic walkthrough");
} else if (requestOverview) {
  const beats = [...requestOverview.block.matchAll(
    /^\s*([A-Za-z][\w.]*)\s*->\s*([A-Za-z][\w.]*)\s+'(\d+)\.\s*([^']+)'\s*$/gm,
  )].map((match) => ({ source: match[1], target: match[2], number: Number(match[3]), label: match[4] }));
  const expectedLabels = [
    'ask and understand locally',
    'cross the published mcp boundary',
    'authenticate and decide',
    'execute admitted work through connectors',
    'shape each audience',
    'return authorised views',
  ];
  const expectedPairs = [
    ['edge.experiences.desktop', 'edge.runtime'],
    ['edge.runtime', 'gateway.ingress'],
    ['gateway.ingress', 'gateway.governance'],
    ['gateway.governance', 'gateway.execution'],
    ['gateway.execution', 'gateway.projection'],
    ['gateway.projection', 'edge.runtime'],
  ];
  if (beats.length !== expectedLabels.length) {
    diagnostics.push("architecture view: 'flow_governed_request_overview' must contain exactly five story beats");
  } else {
    for (const [index, beat] of beats.entries()) {
      if (beat.number !== index + 1 || !beat.label.toLowerCase().startsWith(expectedLabels[index])) {
        diagnostics.push(
          `architecture view: governed-request beat ${index + 1} must be '${expectedLabels[index]}'`,
        );
      }
      if (beat.source !== expectedPairs[index][0] || beat.target !== expectedPairs[index][1]) {
        diagnostics.push(
          `architecture view: governed-request beat ${index + 1} must use its canonical architecture relationship`,
        );
      }
    }
  }
}

const governanceOutcomes = viewDefinitions.get('governance_outcomes');
if (governanceOutcomes?.dynamic) {
  diagnostics.push("architecture view: 'governance_outcomes' must be a static branching view, not a sequential request");
}
for (const requiredElement of [
  'gateway.governance.policy',
  'gateway.governance.confirmation',
  'gateway.governance.denied_outcome',
  'gateway.governance.audit',
  'gateway.execution.orchestrator',
]) {
  if (governanceOutcomes && !new RegExp(`\\binclude\\s+${requiredElement.replaceAll('.', '\\.') }\\b`).test(governanceOutcomes.block)) {
    diagnostics.push(`architecture view: 'governance_outcomes' must include '${requiredElement}'`);
  }
}

const deploymentVariants = viewDefinitions.get('deployment_variants');
for (const requiredElement of [
  'edge.experiences.desktop',
  'edge.experiences.ios',
  'edge.experiences.embedded_web',
  'edge.runtime.ui_adapter',
  'edge.runtime.orchestration',
  'edge.runtime.mcp_client',
  'gateway.deployments.nhs_gateway',
  'gateway.deployments.nhs_gateway.mcp_endpoint',
  'gateway.deployments.nhs_gateway.governed_runtime',
  'gateway.deployments.northstar_gateway',
  'gateway.deployments.northstar_gateway.mcp_endpoint',
  'gateway.deployments.northstar_gateway.governed_runtime',
  'enterprise',
]) {
  if (deploymentVariants && !new RegExp(`\\binclude\\s+${requiredElement.replaceAll('.', '\\.') }\\b`).test(deploymentVariants.block)) {
    diagnostics.push(`architecture view: 'deployment_variants' must include '${requiredElement}'`);
  }
}

let registeredViewIds = [];
let descriptorViewIds = [];
try {
  const registry = await readFile(portalViewRegistry, 'utf8');
  const registryArray = /architectureViewIds\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(registry)?.[1];
  if (!registryArray) {
    diagnostics.push('portal view registry: could not read architectureViewIds');
  } else {
    registeredViewIds = [...registryArray.matchAll(/'([A-Za-z][\w]*)'/g)].map((match) => match[1]);
  }
  const descriptorArray = /architectureViews[^=]*=\s*\[([\s\S]*?)\]\s*as const/.exec(registry)?.[1];
  if (!descriptorArray) {
    diagnostics.push('portal view registry: could not read architectureViews descriptors');
  } else {
    descriptorViewIds = [...descriptorArray.matchAll(/\bid\s*:\s*'([A-Za-z][\w]*)'/g)]
      .map((match) => match[1]);
  }
} catch (cause) {
  diagnostics.push(`portal view registry: could not be read (${cause.message})`);
}

const registeredViewSet = new Set(registeredViewIds);
if (registeredViewSet.size !== registeredViewIds.length) {
  diagnostics.push('portal view registry: architectureViewIds contains a duplicate stable ID');
}
const descriptorViewSet = new Set(descriptorViewIds);
if (descriptorViewSet.size !== descriptorViewIds.length) {
  diagnostics.push('portal view registry: architectureViews contains a duplicate descriptor');
}
for (const viewId of registeredViewSet) {
  if (!descriptorViewSet.has(viewId)) {
    diagnostics.push(`portal view registry: '${viewId}' has no architectureViews descriptor`);
  }
}
for (const viewId of descriptorViewSet) {
  if (!registeredViewSet.has(viewId)) {
    diagnostics.push(`portal view registry: descriptor '${viewId}' is absent from architectureViewIds`);
  }
}
for (const viewId of viewIds) {
  if (!registeredViewSet.has(viewId)) {
    diagnostics.push(`portal view registry: canonical LikeC4 view '${viewId}' is not registered`);
  }
}
for (const viewId of registeredViewSet) {
  if (!viewIds.has(viewId)) {
    diagnostics.push(`portal view registry: '${viewId}' does not resolve to a canonical LikeC4 view`);
  }
}

const lockFile = join(architectureRoot, 'evidence.lock.json');
let evidenceLock;
try {
  evidenceLock = JSON.parse(await readFile(lockFile, 'utf8'));
} catch (cause) {
  diagnostics.push(`architecture/evidence.lock.json: invalid JSON (${cause.message})`);
}
if (evidenceLock) {
  const repositories = evidenceLock.repositories ?? {};
  const requiredPins = {
    zone1: '10419805f78af9a22234e4cd1a504494ec6895b4',
    zone2: '0ad691dfbb9095d7b2d786a53ef22afdd7a1e9c6',
  };
  for (const [repository, pin] of Object.entries(requiredPins)) {
    if (repositories[repository]?.commit !== pin) {
      diagnostics.push(`architecture/evidence.lock.json: ${repository} must be pinned to ${pin}`);
    }
    if (repositories[repository]?.visibility !== 'private') {
      diagnostics.push(`architecture/evidence.lock.json: ${repository} must declare private visibility`);
    }
  }
}

if (diagnostics.length > 0) {
  console.error(`Architecture validation failed with ${diagnostics.length} diagnostic(s):`);
  for (const diagnostic of diagnostics) console.error(`- ${diagnostic}`);
  process.exitCode = 1;
} else {
  console.log(`Architecture validation passed: ${elements.length} elements, ${relations.length} relationships, ${viewIds.size} stable views.`);
}
