import {describe, expect, it} from 'vitest';

import {
  deriveStatusBadges,
  normaliseArchitectureMetadata,
  resolveEvidenceReference,
} from '../../src/architecture/evidence';

const lock = {
  repositories: {
    zone1: {
      repository: 'https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneOne',
      visibility: 'private',
      commit: '10419805f78af9a22234e4cd1a504494ec6895b4',
    },
  },
};

describe('architecture evidence', () => {
  it('keeps maturity and verification as independent badges', () => {
    const metadata = normaliseArchitectureMetadata({
      maturity: 'implemented',
      verification: 'automated',
      evidence: 'zone1:runtime/src/zone1/application/invoke_capability.py#InvokeCapability',
    });

    expect(deriveStatusBadges(metadata)).toEqual([
      {dimension: 'maturity', value: 'implemented'},
      {dimension: 'verification', value: 'automated'},
    ]);
  });

  it('normalises repeatable constraints and outcomes without mixing them into status', () => {
    const metadata = normaliseArchitectureMetadata({
      constraint_direct: 'Cannot access enterprise systems directly.',
      constraint_policy: ['Cannot reproduce Gateway policy locally.'],
      outcome_allow: 'Allow and execute',
      outcome_confirm: 'Require confirmation',
    });

    expect(metadata.constraints).toEqual([
      'Cannot access enterprise systems directly.',
      'Cannot reproduce Gateway policy locally.',
    ]);
    expect(metadata.outcomes).toEqual(['Allow and execute', 'Require confirmation']);
    expect(deriveStatusBadges(metadata)).toEqual([]);
  });

  it('resolves private evidence to an immutable commit URL', () => {
    const result = resolveEvidenceReference(
      'zone1:runtime/src/zone1/application/invoke_capability.py#InvokeCapability',
      lock,
    );

    expect(result.accessRequired).toBe(true);
    expect(result.href).toContain('/blob/10419805f78af9a22234e4cd1a504494ec6895b4/');
    expect(result.href).toContain('runtime/src/zone1/application/invoke_capability.py');
  });

  it('leaves malformed references visible but unlinked', () => {
    expect(resolveEvidenceReference('not-a-reference', lock)).toEqual({
      reference: 'not-a-reference',
      accessRequired: false,
    });
  });
});
