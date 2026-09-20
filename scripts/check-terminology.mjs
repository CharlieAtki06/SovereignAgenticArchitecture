#!/usr/bin/env node

import {readdir, readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const primaryRoots = [
  path.join(root, 'README.md'),
  path.join(root, 'CONTEXT-MAP.md'),
  path.join(root, 'CONTRIBUTING.md'),
  path.join(root, 'docs'),
];

const ignoredSegments = new Set(['adr', 'dev', 'research', 'graphs']);
const forbidden = [
  {
    pattern: /Zone 1\s+[—-]\s+Edge Runtime/g,
    replacement: 'Edge — Zone 1 (then distinguish Edge Experience and Edge Runtime)',
  },
  {
    pattern: /Zone 2\s+[—-]\s+Governed (?:Mediation|Layer)/g,
    replacement: 'Governance Gateway — Zone 2',
  },
  {
    pattern: /Zone 3\s+[—-]\s+(?:Reasoning Model|Enterprise Resources|Enterprise Sources)/g,
    replacement: 'Enterprise Intelligence & Resources — Zone 3',
  },
  {
    pattern: /\bApp Overlay\b/g,
    replacement: 'App Presentation or desktop Prefab overlay, depending on the concept',
  },
];

async function markdownFiles(entry) {
  const stats = await stat(entry);
  if (stats.isFile()) {
    return entry.endsWith('.md') ? [entry] : [];
  }

  const files = [];
  for (const dirent of await readdir(entry, {withFileTypes: true})) {
    if (dirent.isDirectory() && ignoredSegments.has(dirent.name)) {
      continue;
    }
    files.push(...(await markdownFiles(path.join(entry, dirent.name))));
  }
  return files;
}

const diagnostics = [];
for (const entry of primaryRoots) {
  let files = [];
  try {
    files = await markdownFiles(entry);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      continue;
    }
    throw error;
  }

  for (const file of files) {
    const lines = (await readFile(file, 'utf8')).split('\n');
    for (const [index, line] of lines.entries()) {
      for (const rule of forbidden) {
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(line)) {
          diagnostics.push(
            `${path.relative(root, file)}:${index + 1}: use “${rule.replacement}”`,
          );
        }
      }
    }
  }
}

if (diagnostics.length > 0) {
  console.error('Terminology check failed:\n');
  console.error(diagnostics.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Terminology check passed.');
}
