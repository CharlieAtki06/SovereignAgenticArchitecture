#!/usr/bin/env node

import {appendFile, readFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const lockPath = join(repositoryRoot, 'architecture', 'evidence.lock.json');
const token = process.env.ZONE_EVIDENCE_READ_TOKEN;
const apiRoot = process.env.GITHUB_API_URL ?? 'https://api.github.com';

if (!token) {
  console.error('ZONE_EVIDENCE_READ_TOKEN is required to inspect the private zone repositories.');
  process.exit(2);
}

function githubSlug(repositoryUrl) {
  const url = new URL(repositoryUrl);
  if (url.hostname !== 'github.com') {
    throw new Error(`unsupported repository host '${url.hostname}'`);
  }
  const parts = url.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
  if (parts.length !== 2 || parts.some((part) => !part)) {
    throw new Error(`cannot derive a GitHub repository from '${repositoryUrl}'`);
  }
  return parts.join('/');
}

async function github(path) {
  const response = await fetch(`${apiRoot}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'sovereign-architecture-evidence-check',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${path} returned ${response.status} ${response.statusText}`);
  }
  return response.json();
}

const lock = JSON.parse(await readFile(lockPath, 'utf8'));
const results = [];

for (const [name, repository] of Object.entries(lock.repositories ?? {})) {
  if (repository.visibility !== 'private') continue;
  if (!repository.commit) throw new Error(`${name} has no pinned commit`);

  const slug = githubSlug(repository.repositoryUrl);
  const metadata = await github(`/repos/${slug}`);
  const branch = metadata.default_branch;
  const latest = await github(`/repos/${slug}/commits/${encodeURIComponent(branch)}`);
  results.push({
    name,
    slug,
    branch,
    pinned: repository.commit,
    latest: latest.sha,
    stale: repository.commit !== latest.sha,
  });
}

const lines = [
  '## Evidence pin staleness',
  '',
  '| Repository | Default branch | Pinned revision | Branch head | Status |',
  '|---|---|---|---|---|',
  ...results.map((result) => `| ${result.slug} | \`${result.branch}\` | \`${result.pinned.slice(0, 12)}\` | \`${result.latest.slice(0, 12)}\` | ${result.stale ? 'stale' : 'current'} |`),
  '',
  'This check is read-only. Evidence pins are changed only through an intentional documentation pull request.',
  '',
];

const report = lines.join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, report, 'utf8');
}

const stale = results.filter((result) => result.stale);
if (stale.length > 0) {
  console.error(`${stale.length} evidence pin(s) no longer match their repository default-branch head.`);
  process.exitCode = 1;
}
