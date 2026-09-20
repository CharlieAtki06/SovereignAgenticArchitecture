export interface ArchitectureMetadata {
  readonly owner?: string;
  readonly maturity?: string;
  readonly verification?: string;
  readonly evidence: readonly string[];
  readonly limitations: readonly string[];
  readonly constraints: readonly string[];
  readonly outcomes: readonly string[];
}

export interface EvidenceLink {
  readonly reference: string;
  readonly href?: string;
  readonly accessRequired: boolean;
}

export interface StatusBadge {
  readonly dimension: 'maturity' | 'verification';
  readonly value: string;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function stringValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(stringValues);
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(/\s*(?:\n|,|\|)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function statementValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(statementValues);
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(/\s*(?:\n|\|)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normaliseArchitectureMetadata(value: unknown): ArchitectureMetadata {
  const metadata = asRecord(value);
  const evidence = Object.entries(metadata)
    .filter(([key]) => key === 'evidence' || key.startsWith('evidence_'))
    .flatMap(([, item]) => stringValues(item));
  const limitations = Object.entries(metadata)
    .filter(([key]) => key === 'limitation' || key.startsWith('limitation_'))
    .flatMap(([, item]) => stringValues(item));
  const constraints = Object.entries(metadata)
    .filter(([key]) => key === 'constraint' || key.startsWith('constraint_'))
    .flatMap(([, item]) => statementValues(item));
  const outcomes = Object.entries(metadata)
    .filter(([key]) => key === 'outcome' || key.startsWith('outcome_'))
    .flatMap(([, item]) => statementValues(item));

  return {
    owner: typeof metadata.owner === 'string' ? metadata.owner : undefined,
    maturity: typeof metadata.maturity === 'string' ? metadata.maturity : undefined,
    verification: typeof metadata.verification === 'string' ? metadata.verification : undefined,
    evidence,
    limitations,
    constraints,
    outcomes,
  };
}

export function deriveStatusBadges(metadata: ArchitectureMetadata): readonly StatusBadge[] {
  const badges: StatusBadge[] = [];
  if (metadata.maturity) {
    badges.push({dimension: 'maturity', value: metadata.maturity});
  }
  if (metadata.verification) {
    badges.push({dimension: 'verification', value: metadata.verification});
  }
  return badges;
}

function repositoryEntries(lock: unknown): UnknownRecord {
  const record = asRecord(lock);
  return asRecord(record.repositories ?? record.sources ?? record);
}

function repositoryEntry(lock: unknown, alias: string): UnknownRecord {
  return asRecord(repositoryEntries(lock)[alias]);
}

function firstString(record: UnknownRecord, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    if (typeof record[key] === 'string' && record[key]) {
      return record[key] as string;
    }
  }
  return undefined;
}

function encodeRepositoryPath(value: string): string {
  return value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function resolveEvidenceReference(reference: string, lock: unknown): EvidenceLink {
  const match = /^(root|zone1|zone2|external):([^#]+)(?:#(.+))?$/.exec(reference.trim());
  if (!match) {
    return {reference, accessRequired: false};
  }

  const [, alias, sourcePath, symbol] = match;
  if (alias === 'external') {
    const href = /^https?:\/\//.test(sourcePath) ? sourcePath : undefined;
    return {reference, href, accessRequired: false};
  }

  const entry = repositoryEntry(lock, alias);
  const repository =
    firstString(entry, ['repository', 'repositoryUrl', 'url']) ??
    (alias === 'root'
      ? 'https://github.com/CharlieAtki06/SovereignAgenticArchitecture'
      : undefined);
  const commit = firstString(entry, ['commit', 'revision', 'sha']) ?? (alias === 'root' ? 'main' : undefined);
  const visibility = firstString(entry, ['visibility']);

  if (!repository || !commit) {
    return {reference, accessRequired: alias !== 'root'};
  }

  const cleanRepository = repository.replace(/\.git$/, '');
  const encodedPath = encodeRepositoryPath(sourcePath);
  const encodedSymbol = symbol ? `#:~:text=${encodeURIComponent(symbol)}` : '';
  return {
    reference,
    href: `${cleanRepository}/blob/${encodeURIComponent(commit)}/${encodedPath}${encodedSymbol}`,
    accessRequired: visibility === 'private' || alias === 'zone1' || alias === 'zone2',
  };
}

export function resolveEvidenceReferences(
  references: readonly string[],
  lock: unknown,
): readonly EvidenceLink[] {
  return references.map((reference) => resolveEvidenceReference(reference, lock));
}
