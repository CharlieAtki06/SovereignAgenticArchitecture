#!/usr/bin/env node

import { access, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const architectureRoot = join(repoRoot, 'architecture');
const lockPath = join(architectureRoot, 'evidence.lock.json');
const diagnostics = [];

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!['--root', '--zone1', '--zone2'].includes(argument)) {
      throw new Error(`unknown argument '${argument}'`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a path`);
    values[argument.slice(2)] = resolve(value);
    index += 1;
  }
  return values;
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

function splitReference(reference) {
  const separatorAt = reference.indexOf(':');
  if (separatorAt < 1) return null;
  const repository = reference.slice(0, separatorAt);
  const remainder = reference.slice(separatorAt + 1);
  const hashAt = remainder.indexOf('#');
  return {
    repository,
    path: hashAt < 0 ? remainder : remainder.slice(0, hashAt),
    symbol: hashAt < 0 ? null : remainder.slice(hashAt + 1),
  };
}

function git(directory, arguments_, options = {}) {
  return spawnSync('git', ['-C', directory, ...arguments_], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
}

function lockedObject(directory, commit, path) {
  const object = `${commit}:${path}`;
  const type = git(directory, ['cat-file', '-t', object]);
  if (type.status !== 0) return null;
  return { object, type: type.stdout.trim() };
}

let overrides;
try {
  overrides = parseArguments(process.argv.slice(2));
} catch (cause) {
  console.error(`Evidence validation failed: ${cause.message}`);
  process.exit(2);
}

const evidenceLock = JSON.parse(await readFile(lockPath, 'utf8'));
const repositories = evidenceLock.repositories ?? {};
const repositoryRoots = {};
const unavailableRepositories = new Set();
for (const [name, configuration] of Object.entries(repositories)) {
  const configured = configuration.localPath;
  repositoryRoots[name] = overrides[name]
    ?? (isAbsolute(configured) ? configured : resolve(repoRoot, configured));
}

const modelFiles = await filesBelow(architectureRoot, '.c4');
const references = new Map();
for (const file of modelFiles) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/^\s*evidence\s+'([^']+)'\s*$/gm)) {
    const reference = match[1];
    if (!references.has(reference)) references.set(reference, []);
    references.get(reference).push(relative(repoRoot, file));
  }
}

for (const [name, configuration] of Object.entries(repositories)) {
  const directory = repositoryRoots[name];
  try {
    await access(directory, fsConstants.R_OK);
  } catch {
    diagnostics.push(`${name}: repository root is not readable at ${directory}`);
    unavailableRepositories.add(name);
    continue;
  }

  if (configuration.commit) {
    const pinnedCommit = git(directory, ['cat-file', '-e', `${configuration.commit}^{commit}`]);
    if (pinnedCommit.status !== 0) {
      diagnostics.push(`${name}: locked commit ${configuration.commit} is unavailable at ${directory}`);
      unavailableRepositories.add(name);
    }
  }
}

for (const [reference, origins] of references) {
  const parsed = splitReference(reference);
  if (!parsed || !repositories[parsed.repository]) {
    diagnostics.push(`${reference}: unknown evidence repository (used by ${origins.join(', ')})`);
    continue;
  }
  if (!parsed.path || parsed.path.startsWith('/') || parsed.path.split('/').includes('..')) {
    diagnostics.push(`${reference}: evidence path must be repository-relative and cannot traverse parents`);
    continue;
  }

  if (unavailableRepositories.has(parsed.repository)) continue;

  const configuration = repositories[parsed.repository];
  const root = repositoryRoots[parsed.repository];

  // Cross-repository evidence is immutable: resolve it from the locked Git
  // object, never from whichever branch happens to be checked out locally.
  if (configuration.commit) {
    const object = lockedObject(root, configuration.commit, parsed.path);
    if (!object) {
      diagnostics.push(`${reference}: path does not exist at locked commit ${configuration.commit} (used by ${origins.join(', ')})`);
      continue;
    }
    if (parsed.symbol) {
      if (object.type !== 'blob') {
        diagnostics.push(`${reference}: symbol evidence must point to a file at the locked commit`);
        continue;
      }
      const content = git(root, ['cat-file', '-p', object.object]);
      if (content.status !== 0) {
        diagnostics.push(`${reference}: could not read the locked evidence object`);
      } else if (!content.stdout.includes(parsed.symbol)) {
        diagnostics.push(`${reference}: symbol text '${parsed.symbol}' was not found at locked commit ${configuration.commit}`);
      }
    }
    continue;
  }

  // Root documentation is intentionally checked against the working tree so
  // a documentation change can provide evidence before it has a commit.
  const target = resolve(root, parsed.path);
  const relativeTarget = relative(root, target);
  if (relativeTarget.startsWith(`..${sep}`) || relativeTarget === '..') {
    diagnostics.push(`${reference}: resolved outside its repository root`);
    continue;
  }

  let targetStat;
  try {
    targetStat = await stat(target);
    const canonicalRoot = await realpath(root);
    const canonicalTarget = await realpath(target);
    const canonicalRelative = relative(canonicalRoot, canonicalTarget);
    if (canonicalRelative.startsWith(`..${sep}`) || canonicalRelative === '..') {
      diagnostics.push(`${reference}: symlink resolves outside its repository root`);
      continue;
    }
  } catch {
    diagnostics.push(`${reference}: path does not exist (used by ${origins.join(', ')})`);
    continue;
  }

  if (parsed.symbol) {
    if (!targetStat.isFile()) {
      diagnostics.push(`${reference}: symbol evidence must point to a file`);
      continue;
    }
    const content = await readFile(target, 'utf8');
    if (!content.includes(parsed.symbol)) {
      diagnostics.push(`${reference}: symbol text '${parsed.symbol}' was not found`);
    }
  }
}

if (diagnostics.length > 0) {
  console.error(`Evidence validation failed with ${diagnostics.length} diagnostic(s):`);
  for (const diagnostic of diagnostics) console.error(`- ${diagnostic}`);
  process.exitCode = 1;
} else {
  console.log(`Evidence validation passed: ${references.size} unique references across ${Object.keys(repositories).length} repositories.`);
}
