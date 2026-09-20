#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const graphsRoot = join(repoRoot, 'docs', 'graphs');
const lock = JSON.parse(await readFile(join(repoRoot, 'architecture', 'evidence.lock.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(graphsRoot, 'manifest.json'), 'utf8'));
const diagnostics = [];

for (const zone of ['zone1', 'zone2']) {
  const locked = lock.repositories?.[zone];
  const recorded = manifest.sources?.[zone];
  if (!locked) {
    diagnostics.push(`${zone}: missing from architecture/evidence.lock.json`);
    continue;
  }
  if (!recorded) {
    diagnostics.push(`${zone}: missing from docs/graphs/manifest.json`);
    continue;
  }

  if (recorded.commit !== locked.commit) {
    diagnostics.push(`${zone}: graph commit ${recorded.commit} does not match evidence lock ${locked.commit}`);
  }
  const lockedUrl = locked.repositoryUrl.replace(/\.git$/, '');
  if (recorded.repository !== lockedUrl) {
    diagnostics.push(`${zone}: graph repository ${recorded.repository} does not match evidence lock ${lockedUrl}`);
  }
  if (recorded.extraction !== 'clean git archive') {
    diagnostics.push(`${zone}: extraction must be recorded as 'clean git archive'`);
  }

  let viewer;
  try {
    viewer = await readFile(join(graphsRoot, recorded.viewer), 'utf8');
  } catch (cause) {
    diagnostics.push(`${zone}: cannot read ${recorded.viewer} (${cause.message})`);
    continue;
  }
  const checksum = createHash('sha256').update(viewer).digest('hex');
  if (checksum !== recorded.sha256) {
    diagnostics.push(`${zone}: viewer checksum ${checksum} does not match manifest ${recorded.sha256}`);
  }

  const payload = viewer.match(/const RAW_NODES = (\[.*?\]);\s*const RAW_EDGES = (\[.*?\]);/s);
  if (!payload) {
    diagnostics.push(`${zone}: viewer does not contain the expected Graphify payload`);
  } else {
    try {
      const nodes = JSON.parse(payload[1]).length;
      const edges = JSON.parse(payload[2]).length;
      if (nodes !== recorded.nodes) diagnostics.push(`${zone}: viewer has ${nodes} nodes; manifest records ${recorded.nodes}`);
      if (edges !== recorded.edges) diagnostics.push(`${zone}: viewer has ${edges} edges; manifest records ${recorded.edges}`);
    } catch (cause) {
      diagnostics.push(`${zone}: cannot parse Graphify payload (${cause.message})`);
    }
  }

  // The committed Graphify output is kept intact. Portal staging replaces
  // this exact tag with the package-pinned local vis-network asset.
  if (!viewer.includes('https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js')) {
    diagnostics.push(`${zone}: expected Graphify vis-network source tag is missing; local staging cannot replace it safely`);
  }
}

if (diagnostics.length > 0) {
  console.error(`Graph validation failed with ${diagnostics.length} diagnostic(s):`);
  for (const diagnostic of diagnostics) console.error(`- ${diagnostic}`);
  process.exitCode = 1;
} else {
  console.log('Graph validation passed: viewers match the immutable evidence pins and manifest checksums.');
}
