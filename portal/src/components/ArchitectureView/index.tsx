import BrowserOnly from '@docusaurus/BrowserOnly';
import Link from '@docusaurus/Link';
import React, {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

import {
  architectureViewLabel,
  type ArchitectureViewId,
  type ArchitectureViewMode,
} from '../../architecture/views';
import {
  projectArchitectureAudience,
  type EngineeringProjection,
  type PresenterProjection,
} from './audienceProjection';
import {
  adaptArchitectureSelection,
  adaptArchitectureView,
  selectionFromDiagramClick,
  type ArchitectureSelection,
  type ArchitectureSelectionKind,
} from './modelAdapter';
import styles from './styles.module.css';

export interface ArchitectureViewProps {
  readonly viewId: ArchitectureViewId;
  readonly mode?: ArchitectureViewMode;
  /** One-based dynamic-diagram walkthrough step, never a presenter scene number. */
  readonly step?: number;
}

interface BoundaryProps {
  readonly children: ReactNode;
  readonly viewId: ArchitectureViewId;
}

interface BoundaryState {
  readonly failed: boolean;
}

class DiagramErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  public state: BoundaryState = {failed: false};

  public static getDerivedStateFromError(): BoundaryState {
    return {failed: true};
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the public fallback calm while preserving useful diagnostics locally.
    console.error(`Architecture view "${this.props.viewId}" failed to render`, error, info);
  }

  public render(): ReactNode {
    if (this.state.failed) {
      return <ArchitectureFallback viewId={this.props.viewId} reason="unavailable" />;
    }
    return this.props.children;
  }
}

type GeneratedModule = {
  readonly ReactLikeC4?: ComponentType<Record<string, unknown>>;
  readonly LikeC4View?: ComponentType<Record<string, unknown>>;
  readonly likeC4Model?: unknown;
  readonly likec4model?: unknown;
};

interface DiagramWalkthroughApi {
  readonly startWalkthrough: () => void;
  readonly walkthroughStep: (direction?: 'next' | 'previous') => void;
  readonly stopWalkthrough: () => void;
}

const localDiagramTheme = {
  fontFamily: "'Inter Variable', Inter, ui-sans-serif, system-ui, sans-serif",
  headings: {
    fontFamily: "'Inter Variable', Inter, ui-sans-serif, system-ui, sans-serif",
  },
};

export function ClientArchitectureDiagram({
  generated,
  evidenceLock,
  viewId,
  mode = 'embedded',
  step,
}: {
  readonly generated: GeneratedModule;
  readonly evidenceLock: unknown;
  readonly viewId: ArchitectureViewId;
  readonly mode?: ArchitectureViewMode;
  /** One-based dynamic-diagram walkthrough step, never a presenter scene number. */
  readonly step?: number;
}): ReactNode {
  const Diagram = generated.ReactLikeC4 ?? generated.LikeC4View;
  const model = generated.likeC4Model ?? generated.likec4model;
  const [currentView, setCurrentView] = useState<ArchitectureViewId>(viewId);
  const [selected, setSelected] = useState<ArchitectureSelection | null>(null);
  const [diagramApi, setDiagramApi] = useState<DiagramWalkthroughApi | null>(null);
  const appliedStep = useRef<number | undefined>(undefined);
  const previousViewId = useRef<ArchitectureViewId>(viewId);
  const selectionReturnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (previousViewId.current === viewId) {
      return;
    }
    previousViewId.current = viewId;
    setCurrentView(viewId);
    setSelected(null);
    setDiagramApi(null);
    appliedStep.current = undefined;
  }, [viewId]);

  const adaptedView = useMemo(
    () => adaptArchitectureView(model, currentView),
    [currentView, model],
  );

  const details = useMemo(() => {
    if (!selected) {
      return null;
    }
    const entity = adaptArchitectureSelection(model, currentView, selected);
    return entity ? projectArchitectureAudience(entity, mode, evidenceLock) : null;
  }, [currentView, evidenceLock, mode, model, selected]);

  const closeSelection = useCallback(() => {
    setSelected(null);
    const returnTarget = selectionReturnFocus.current;
    selectionReturnFocus.current = null;
    if (returnTarget?.isConnected) {
      window.requestAnimationFrame(() => returnTarget.focus());
    }
  }, []);

  useEffect(() => {
    if (!diagramApi || !adaptedView.isDynamic) {
      return;
    }
    if (step === undefined) {
      if (appliedStep.current !== undefined) {
        diagramApi.stopWalkthrough();
        appliedStep.current = undefined;
      }
      return;
    }
    const finiteStep = Number.isFinite(step) ? step : 1;
    const requestedStep = Math.min(
      adaptedView.walkthroughSteps,
      Math.max(1, Math.floor(finiteStep)),
    );
    if (adaptedView.walkthroughSteps === 0 || appliedStep.current === requestedStep) {
      return;
    }
    diagramApi.stopWalkthrough();
    diagramApi.startWalkthrough();
    for (let index = 1; index < requestedStep; index += 1) {
      diagramApi.walkthroughStep('next');
    }
    appliedStep.current = requestedStep;
  }, [adaptedView.isDynamic, adaptedView.walkthroughSteps, diagramApi, step]);

  useEffect(() => {
    if (mode !== 'presenter' || !selected) {
      return undefined;
    }
    const closeTransientLayer = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      closeSelection();
    };
    window.addEventListener('keydown', closeTransientLayer, true);
    return () => window.removeEventListener('keydown', closeTransientLayer, true);
  }, [closeSelection, mode, selected]);

  if (!Diagram) {
    throw new Error('The generated LikeC4 module exports no React view component.');
  }

  const selectId = (kind: ArchitectureSelectionKind) => (value: unknown): void => {
    const nextSelection = selectionFromDiagramClick(kind, value);
    if (nextSelection) {
      selectionReturnFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setSelected(nextSelection);
    }
  };

  return (
    <div
      className={styles.diagramHost}
      data-view-kind={adaptedView.isDynamic ? 'dynamic' : 'static'}
      style={mode === 'presenter' ? adaptedView.presenterStyle : undefined}>
      <Diagram
        key={currentView}
        viewId={currentView}
        injectFontCss={false}
        mantineTheme={localDiagramTheme}
        pannable
        zoomable
        keepAspectRatio={false}
        fitView
        fitViewPadding={{top: '76px', right: '28px', bottom: '28px', left: '28px'}}
        browser
        controls={mode !== 'embedded'}
        showNavigationButtons={mode !== 'embedded'}
        enableDynamicViewWalkthrough={adaptedView.isDynamic}
        enableElementDetails={false}
        enableRelationshipDetails={false}
        showDiagramTitle={false}
        onInitialized={(params: unknown) => {
          const diagram = (params as {diagram?: DiagramWalkthroughApi})?.diagram;
          if (diagram) {
            setDiagramApi(diagram);
          }
        }}
        onNavigateTo={(next: unknown) => {
          if (typeof next === 'string') {
            setCurrentView(next as ArchitectureViewId);
            setSelected(null);
            setDiagramApi(null);
            appliedStep.current = undefined;
          }
        }}
        onCanvasClick={closeSelection}
        onNodeClick={selectId('element')}
        onEdgeClick={selectId('relationship')}
      />
      {selected && details &&
        (mode === 'presenter' ? (
          <PresenterDetailsPanel
            kind={selected.kind}
            details={details as PresenterProjection}
            onClose={closeSelection}
          />
        ) : (
          <EngineeringDetailsPanel
            kind={selected.kind}
            details={details as EngineeringProjection}
            onClose={closeSelection}
          />
        ))}
    </div>
  );
}

function PresenterDetailsPanel({
  kind,
  details,
  onClose,
}: {
  readonly kind: ArchitectureSelectionKind;
  readonly details: PresenterProjection;
  readonly onClose: () => void;
}): ReactNode {
  return (
    <div
      role="dialog"
      aria-modal="false"
      className={styles.evidenceDrawer}
      data-audience="presenter"
      aria-label={`Details for ${details.title}`}>
      <DrawerHeader kind={kind} title={details.title} closeLabel="Close details" onClose={onClose} />
      <PlainLanguageSection title="Role" values={[details.role]} />
      <PlainLanguageSection
        title="Receives"
        values={details.receives}
        empty="No incoming interaction is shown in this view."
      />
      <PlainLanguageSection
        title="Returns"
        values={details.returns}
        empty="No outgoing interaction is shown in this view."
      />
      <PlainLanguageSection
        title="Cannot do"
        values={details.cannotDo}
        empty="No explicit prohibition is declared for this item."
      />
    </div>
  );
}

function PlainLanguageSection({
  title,
  values,
  empty,
}: {
  readonly title: string;
  readonly values: readonly string[];
  readonly empty?: string;
}): ReactNode {
  return (
    <div className={styles.drawerSection}>
      <strong>{title}</strong>
      {values.length === 1 ? (
        <p>{values[0]}</p>
      ) : values.length > 1 ? (
        <ul>
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </div>
  );
}

function DrawerHeader({
  kind,
  title,
  closeLabel,
  onClose,
}: {
  readonly kind: ArchitectureSelectionKind;
  readonly title: string;
  readonly closeLabel: string;
  readonly onClose: () => void;
}): ReactNode {
  return (
    <>
      <button
        type="button"
        className={styles.drawerClose}
        aria-label={closeLabel}
        autoFocus
        onClick={onClose}>
        ×
      </button>
      <span className={styles.drawerKind}>{kind}</span>
      <h2>{title}</h2>
    </>
  );
}

function EngineeringDetailsPanel({
  kind,
  details,
  onClose,
}: {
  readonly kind: ArchitectureSelectionKind;
  readonly details: EngineeringProjection;
  readonly onClose: () => void;
}): ReactNode {
  return (
    <div
      role="dialog"
      aria-modal="false"
      className={styles.evidenceDrawer}
      data-audience="engineering"
      aria-label={`Evidence for ${details.title}`}>
      <DrawerHeader kind={kind} title={details.title} closeLabel="Close evidence" onClose={onClose} />
      <div className={styles.badges}>
        {details.badges.map((badge) => (
          <span key={badge.dimension} data-dimension={badge.dimension}>
            <small>{badge.dimension}</small>
            {badge.value}
          </span>
        ))}
      </div>
      {details.owner && (
        <p className={styles.owner}>
          Owner <strong>{details.owner}</strong>
        </p>
      )}
      {details.limitations.length > 0 && (
        <div className={styles.drawerSection}>
          <strong>Limitations</strong>
          <ul>
            {details.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      )}
      <div className={styles.drawerSection}>
        <strong>Evidence</strong>
        {details.evidence.length > 0 ? (
          <ul>
            {details.evidence.map((evidence) => (
              <li key={evidence.reference}>
                {evidence.href ? (
                  <a href={evidence.href} target="_blank" rel="noreferrer">
                    {evidence.reference}
                  </a>
                ) : (
                  evidence.reference
                )}
                {evidence.accessRequired && <small> repository access required</small>}
              </li>
            ))}
          </ul>
        ) : (
          <p>No evidence reference was exposed by the generated model.</p>
        )}
      </div>
    </div>
  );
}

export function ArchitectureFallback({
  viewId,
  reason = 'loading',
}: {
  readonly viewId: ArchitectureViewId;
  readonly reason?: 'loading' | 'unavailable';
}): ReactNode {
  const label = architectureViewLabel(viewId);
  return (
    <div className={styles.fallback} role={reason === 'unavailable' ? 'alert' : 'status'}>
      <span className={styles.fallbackMark} aria-hidden="true">
        {reason === 'loading' ? '···' : '×'}
      </span>
      <div>
        <strong>{reason === 'loading' ? `Loading ${label}` : `${label} is unavailable`}</strong>
        <p>
          {reason === 'loading'
            ? 'The interactive model loads in the browser.'
            : 'The written engineering reference remains available.'}
        </p>
        {reason === 'unavailable' && <Link to="/docs/system-map">Open the system map</Link>}
      </div>
    </div>
  );
}

/**
 * The sole portal seam around generated LikeC4 code.
 *
 * Pages and MDX content address stable view IDs only. The generated bundle is
 * loaded inside BrowserOnly because LikeC4 views are deliberately client-side.
 */
export default function ArchitectureView({
  viewId,
  mode = 'embedded',
  step,
}: ArchitectureViewProps): ReactNode {
  const label = architectureViewLabel(viewId);

  return (
    <figure
      className={`${styles.frame} ${styles[mode]}`}
      data-architecture-view={viewId}
      data-mode={mode}
      data-step={step}
      aria-label={`${label} architecture view`}>
      <BrowserOnly fallback={<ArchitectureFallback viewId={viewId} />}>
        {() => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const generated = require('../../generated/likec4.generated.js') as GeneratedModule;
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const evidenceLock = require('../../../../architecture/evidence.lock.json') as unknown;

          return (
            <DiagramErrorBoundary viewId={viewId}>
              <ClientArchitectureDiagram
                generated={generated}
                evidenceLock={evidenceLock}
                viewId={viewId}
                mode={mode}
                step={step}
              />
            </DiagramErrorBoundary>
          );
        }}
      </BrowserOnly>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
