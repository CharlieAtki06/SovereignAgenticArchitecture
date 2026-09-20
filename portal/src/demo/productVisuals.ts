import {resolveEvidenceReferences, type EvidenceLink} from '../architecture/evidence';
import type {ProductVisualId} from './scenes';

export interface ProductVisualDefinition {
  readonly id: ProductVisualId;
  readonly imagePath: string;
  readonly intrinsicWidth: number;
  readonly intrinsicHeight: number;
  readonly alt: string;
  readonly label: string;
  readonly sourceLabel: string;
  readonly evidence: readonly string[];
  readonly guidePath: string;
}

export const productVisuals: Record<ProductVisualId, ProductVisualDefinition> = {
  'nhs-clinical-workspace': {
    id: 'nhs-clinical-workspace',
    imagePath: '/img/demo/nhs-clinical-workspace.png',
    intrinsicWidth: 1600,
    intrinsicHeight: 1000,
    alt: 'Synthetic NHS Care Workspace with an aggregate conversation response beside the authorised clinical-record application.',
    label: 'Synthetic demo data',
    sourceLabel: 'Pinned Zone 1 deterministic visual harness',
    evidence: [
      'zone1:desktop/src/visual-harness/nhs-fixture.ts',
      'zone1:desktop/tests/visual/brand-fixtures.visual.spec.ts',
    ],
    guidePath: '/docs/demos/nhs-care',
  },
};

export function resolveProductVisualProvenance(
  visual: ProductVisualDefinition,
  evidenceLock: unknown,
): readonly EvidenceLink[] {
  return resolveEvidenceReferences(visual.evidence, evidenceLock);
}
