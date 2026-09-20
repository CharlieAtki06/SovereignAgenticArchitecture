import type {CSSProperties} from 'react';

export type ArchitectureSelectionKind = 'element' | 'relationship';

export interface ArchitectureSelection {
  readonly id: string;
  readonly kind: ArchitectureSelectionKind;
}

export interface ArchitectureConnection {
  readonly summary: string;
}

export interface AdaptedArchitectureEntity {
  readonly title: string;
  readonly description?: string;
  readonly metadata: unknown;
  readonly receives: readonly ArchitectureConnection[];
  readonly returns: readonly ArchitectureConnection[];
}

export interface AdaptedArchitectureView {
  readonly isDynamic: boolean;
  readonly walkthroughSteps: number;
  readonly presenterStyle?: CSSProperties;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function call<T>(owner: unknown, method: string, ...args: unknown[]): T | undefined {
  const record = asRecord(owner);
  const candidate = record[method];
  if (typeof candidate !== 'function') {
    return undefined;
  }
  try {
    return candidate.call(owner, ...args) as T;
  } catch {
    return undefined;
  }
}

function iterableValues(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof (value as {[Symbol.iterator]?: unknown})[Symbol.iterator] === 'function') {
    return Array.from(value as Iterable<unknown>);
  }
  if (value && typeof value === 'object') {
    return Object.values(value as UnknownRecord);
  }
  return [];
}

function collectionValue(collection: unknown, id: string): unknown {
  if (Array.isArray(collection)) {
    return collection.find((item) => asRecord(item).id === id);
  }
  if (collection && typeof collection === 'object') {
    return (collection as UnknownRecord)[id];
  }
  return undefined;
}

function richText(value: unknown): string | undefined {
  const clean = (text: string): string | undefined => {
    const normalised = text.replace(/\s+/g, ' ').trim();
    return normalised || undefined;
  };
  if (typeof value === 'string') {
    return clean(value);
  }
  const record = asRecord(value);
  for (const candidate of [record.text, record.md, record.html]) {
    if (typeof candidate === 'string') {
      const normalised = clean(candidate);
      if (normalised) {
        return normalised;
      }
    }
  }
  const source = asRecord(record.$source);
  for (const candidate of [source.txt, source.markdown]) {
    if (typeof candidate === 'string') {
      const normalised = clean(candidate);
      if (normalised) {
        return normalised;
      }
    }
  }
  return undefined;
}

function titleOf(value: unknown, fallback = 'Architecture item'): string {
  const record = asRecord(value);
  const raw = asRecord(record.$element ?? record.$relationship ?? record);
  for (const candidate of [
    record.title,
    record.name,
    record.label,
    raw.title,
    raw.name,
    raw.label,
  ]) {
    const title = richText(candidate);
    if (title) {
      return title;
    }
  }
  return fallback;
}

function descriptionOf(value: unknown): string | undefined {
  const record = asRecord(value);
  const raw = asRecord(record.$element ?? record.$relationship ?? record);
  return richText(record.description) ?? richText(raw.description) ?? richText(record.summary);
}

function metadataOf(value: unknown): unknown {
  const viaMethod = call<unknown>(value, 'getMetadata');
  if (viaMethod !== undefined) {
    return viaMethod;
  }
  const record = asRecord(value);
  const raw = asRecord(record.$element ?? record.$relationship ?? record);
  return raw.metadata ?? record.metadata;
}

function modelData(model: unknown): UnknownRecord {
  const record = asRecord(model);
  return asRecord(record.$data ?? record);
}

function findView(model: unknown, viewId: string): unknown {
  return call(model, 'findView', viewId) ?? collectionValue(modelData(model).views, viewId);
}

function findModelEntity(model: unknown, selection: ArchitectureSelection): unknown {
  const methodNames =
    selection.kind === 'element'
      ? ['findElement']
      : ['findRelation', 'findRelationship'];
  for (const method of methodNames) {
    const found = call(model, method, selection.id);
    if (found) {
      return found;
    }
  }
  if (selection.kind === 'element') {
    const deployment = asRecord(model).deployment;
    const deployedElement = call(deployment, 'findElement', selection.id);
    if (deployedElement) {
      return deployedElement;
    }
  }

  const data = modelData(model);
  return collectionValue(
    selection.kind === 'element' ? data.elements : (data.relations ?? data.relationships),
    selection.id,
  );
}

function modelReference(value: unknown): string | undefined {
  const record = asRecord(value);
  const element = asRecord(record.element);
  for (const candidate of [record.modelRef, record.deploymentRef, element.id]) {
    if (typeof candidate === 'string' && candidate) {
      return candidate;
    }
  }
  return undefined;
}

function findViewNode(view: unknown, selectedId: string): unknown {
  const direct = call(view, 'findNode', selectedId);
  if (direct) {
    return direct;
  }
  const byElement = call(view, 'findNodeWithElement', selectedId);
  if (byElement) {
    return byElement;
  }
  const nodes = iterableValues(call(view, 'nodes') ?? asRecord(view).nodes);
  return nodes.find((node) => {
    const record = asRecord(node);
    return record.id === selectedId || modelReference(node) === selectedId;
  });
}

function edgeRelations(edge: unknown): readonly string[] {
  const record = asRecord(edge);
  const raw = asRecord(record.$edge ?? record);
  const publicRelationships = call<unknown>(edge, 'relationships');
  const relationships =
    publicRelationships !== undefined ? publicRelationships : (record.relations ?? raw.relations);
  return iterableValues(relationships)
    .map((relation) =>
      typeof relation === 'string'
        ? relation
        : (asRecord(asRecord(relation).$relationship ?? relation).id as string | undefined),
    )
    .filter((relation): relation is string => typeof relation === 'string');
}

function findViewEdge(view: unknown, relationId: string): unknown {
  const related = iterableValues(call(view, 'edgesWithRelation', relationId));
  if (related.length > 0) {
    return related[0];
  }
  const edges = iterableValues(call(view, 'edges') ?? asRecord(view).edges);
  return edges.find((edge) => {
    const record = asRecord(edge);
    return record.id === relationId || edgeRelations(edge).includes(relationId);
  });
}

function connectionSummary(edge: unknown, direction: 'incoming' | 'outgoing'): string {
  const record = asRecord(edge);
  const counterpart = direction === 'incoming' ? record.source : record.target;
  const counterpartTitle = titleOf(counterpart, 'another element');
  const label = richText(record.label) ?? descriptionOf(edge);
  const qualifier = direction === 'incoming' ? `from ${counterpartTitle}` : `to ${counterpartTitle}`;
  return label ? `${label} — ${qualifier}` : qualifier;
}

function nodeConnections(
  view: unknown,
  selection: ArchitectureSelection,
): Pick<AdaptedArchitectureEntity, 'receives' | 'returns'> {
  const viewSubject =
    selection.kind === 'element'
      ? findViewNode(view, selection.id)
      : findViewEdge(view, selection.id);
  if (!viewSubject) {
    return {receives: [], returns: []};
  }

  if (selection.kind === 'relationship') {
    const record = asRecord(viewSubject);
    return {
      receives: [{summary: `from ${titleOf(record.source, 'source element')}`}],
      returns: [{summary: `to ${titleOf(record.target, 'target element')}`}],
    };
  }

  const record = asRecord(viewSubject);
  const incoming = iterableValues(call(viewSubject, 'incoming') ?? record.incoming ?? record.inEdges);
  const outgoing = iterableValues(call(viewSubject, 'outgoing') ?? record.outgoing ?? record.outEdges);
  return {
    receives: incoming.map((edge) => ({summary: connectionSummary(edge, 'incoming')})),
    returns: outgoing.map((edge) => ({summary: connectionSummary(edge, 'outgoing')})),
  };
}

function boundsOf(view: unknown): {width: number; height: number} | undefined {
  const record = asRecord(view);
  const layouted = asRecord(record.$layouted);
  const sequenceLayout = asRecord(layouted.sequenceLayout ?? record.sequenceLayout);
  const sequenceBounds = asRecord(sequenceLayout.bounds);
  const usesSequenceLayout = (layouted.variant ?? record.variant) === 'sequence';
  const bounds = usesSequenceLayout &&
      typeof sequenceBounds.width === 'number' &&
      typeof sequenceBounds.height === 'number'
    ? sequenceBounds
    : asRecord(record.bounds ?? layouted.bounds);
  return typeof bounds.width === 'number' && typeof bounds.height === 'number'
    ? {width: bounds.width, height: bounds.height}
    : undefined;
}

function presenterStyle(view: unknown): CSSProperties | undefined {
  const bounds = boundsOf(view);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return undefined;
  }
  // Very wide views previously occupied a tall fixed frame and left most of it
  // empty. Capping the ratio preserves enough height for controls and labels.
  const ratio = Math.min(4.2, Math.max(1.6, bounds.width / bounds.height));
  return {'--architecture-aspect': ratio} as CSSProperties;
}

export function adaptArchitectureView(model: unknown, viewId: string): AdaptedArchitectureView {
  const view = findView(model, viewId);
  const record = asRecord(view);
  const layouted = asRecord(record.$layouted);
  const dynamicByMethod = call<boolean>(view, 'isDynamicView');
  const isDynamic =
    dynamicByMethod ?? (record._type === 'dynamic' || layouted._type === 'dynamic');
  const edges = iterableValues(call(view, 'edges') ?? layouted.edges ?? record.edges);
  return {
    isDynamic: Boolean(isDynamic),
    walkthroughSteps: Boolean(isDynamic) ? edges.length : 0,
    presenterStyle: presenterStyle(view),
  };
}

export function adaptArchitectureSelection(
  model: unknown,
  viewId: string,
  selection: ArchitectureSelection,
): AdaptedArchitectureEntity | null {
  const entity = findModelEntity(model, selection);
  if (!entity) {
    return null;
  }
  const view = findView(model, viewId);
  return {
    title: titleOf(entity, selection.id),
    description: descriptionOf(entity),
    metadata: metadataOf(entity),
    ...nodeConnections(view, selection),
  };
}

export function selectionFromDiagramClick(
  kind: ArchitectureSelectionKind,
  value: unknown,
): ArchitectureSelection | null {
  if (typeof value === 'string') {
    return {id: value, kind};
  }
  const record = asRecord(value);
  const underlyingRelation = kind === 'relationship' ? edgeRelations(value)[0] : undefined;
  const id =
    kind === 'relationship' && typeof record.relationId === 'string'
      ? record.relationId
      : typeof underlyingRelation === 'string'
        ? underlyingRelation
        : modelReference(value) ?? (typeof record.id === 'string' ? record.id : undefined);
  return id ? {id, kind} : null;
}
