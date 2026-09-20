import {
  deriveStatusBadges,
  normaliseArchitectureMetadata,
  resolveEvidenceReferences,
  type EvidenceLink,
  type StatusBadge,
} from '../../architecture/evidence';
import type {ArchitectureViewMode} from '../../architecture/views';
import type {AdaptedArchitectureEntity} from './modelAdapter';

export interface PresenterProjection {
  readonly audience: 'presenter';
  readonly title: string;
  readonly role: string;
  readonly receives: readonly string[];
  readonly returns: readonly string[];
  readonly cannotDo: readonly string[];
}

export interface EngineeringProjection {
  readonly audience: 'engineering';
  readonly title: string;
  readonly owner?: string;
  readonly badges: readonly StatusBadge[];
  readonly limitations: readonly string[];
  readonly evidence: readonly EvidenceLink[];
}

export type ArchitectureAudienceProjection = PresenterProjection | EngineeringProjection;

export function projectArchitectureAudience(
  entity: AdaptedArchitectureEntity,
  mode: ArchitectureViewMode,
  evidenceLock: unknown,
): ArchitectureAudienceProjection {
  const metadata = normaliseArchitectureMetadata(entity.metadata);
  if (mode === 'presenter') {
    return {
      audience: 'presenter',
      title: entity.title,
      role: entity.description ?? 'An architectural element participating in this view.',
      receives: entity.receives.map(({summary}) => summary),
      returns: entity.returns.map(({summary}) => summary),
      cannotDo: metadata.constraints,
    };
  }

  return {
    audience: 'engineering',
    title: entity.title,
    owner: metadata.owner,
    badges: deriveStatusBadges(metadata),
    limitations: metadata.limitations,
    evidence: resolveEvidenceReferences(metadata.evidence, evidenceLock),
  };
}
