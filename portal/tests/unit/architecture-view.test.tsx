import React from 'react';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@docusaurus/BrowserOnly', () => ({
  default: ({fallback}: {fallback: React.ReactNode}) => fallback,
}));

vi.mock('@docusaurus/Link', () => ({
  default: ({children, to}: {children: React.ReactNode; to: string}) => (
    <a href={to}>{children}</a>
  ),
}));

import ArchitectureView, {
  ArchitectureFallback,
  ClientArchitectureDiagram,
} from '../../src/components/ArchitectureView';
import {projectArchitectureAudience} from '../../src/components/ArchitectureView/audienceProjection';
import {
  adaptArchitectureSelection,
  adaptArchitectureView,
  selectionFromDiagramClick,
} from '../../src/components/ArchitectureView/modelAdapter';
import {demoScenes, isArchitectureScene} from '../../src/demo/scenes';

const walkthroughApi = {
  startWalkthrough: vi.fn(),
  walkthroughStep: vi.fn(),
  stopWalkthrough: vi.fn(),
};

function architectureFixture({dynamic = true}: {readonly dynamic?: boolean} = {}) {
  const source = {id: 'clinician', title: 'Clinician'};
  const desktopNode = {
    id: 'edge.desktop',
    title: 'Tauri Desktop',
    element: {id: 'edge.desktop'},
  };
  const target = {id: 'gateway', title: 'Governance Gateway'};
  const incoming = {
    id: 'step-01',
    label: 'Starts a request',
    source,
    target: desktopNode,
    relations: ['relation-01'],
  };
  const outgoing = {
    id: 'step-02',
    label: 'Sends a governed MCP call',
    source: desktopNode,
    target,
    relations: ['relation-02'],
  };
  const node = {
    ...desktopNode,
    incoming: () => [incoming],
    outgoing: () => [outgoing],
  };
  const edges = [incoming, outgoing, {...outgoing, id: 'step-03'}];
  const view = {
    description: 'Every enterprise request follows the governed path.',
    bounds: {width: 3200, height: 500},
    isDynamicView: () => dynamic,
    edges: () => edges,
    nodes: () => [node],
    findNode: (id: string) => (id === node.id ? node : null),
    findNodeWithElement: (id: string) => (id === 'edge.desktop' ? node : null),
    edgesWithRelation: (id: string) => edges.filter((edge) => edge.relations.includes(id)),
  };

  return {
    findView: () => view,
    findElement: () => ({
      title: 'Tauri Desktop',
      description: 'Hosts the local user experience.',
      getMetadata: () => ({
        owner: 'zone1',
        maturity: 'implemented',
        verification: 'live',
        constraint_direct_enterprise: 'Cannot access enterprise systems directly.',
        evidence: 'zone1:desktop/src-tauri/tauri.conf.json',
      }),
    }),
    findRelationship: (id: string) =>
      id === 'relation-01'
        ? {
            title: 'Published MCP boundary',
            description: 'Carries a governed request.',
            getMetadata: () => ({
              owner: 'zone2',
              maturity: 'implemented',
              verification: 'automated',
              evidence: 'zone2:src',
            }),
          }
        : undefined,
  };
}

function DiagramProbe({
  props,
  onMount,
}: {
  readonly props: Record<string, unknown>;
  readonly onMount: () => void;
}) {
  React.useEffect(() => {
    onMount();
    const initialized = props.onInitialized as
      | ((params: {diagram: typeof walkthroughApi}) => void)
      | undefined;
    initialized?.({diagram: walkthroughApi});
  }, []);
  const select = props.onNodeClick as ((value: unknown) => void) | undefined;
  const selectEdge = props.onEdgeClick as ((value: unknown) => void) | undefined;

  return (
    <div>
      <span>First architecture item</span>
      <span>Final architecture item</span>
      {props.controls === true && <span>Native LikeC4 header</span>}
      {props.controls === true && props.enableDynamicViewWalkthrough === true && (
        <>
          <button type="button">Diagram</button>
          <button type="button">Sequence</button>
          <button type="button">Start</button>
        </>
      )}
      <button type="button" onClick={() => select?.({id: 'node-01', modelRef: 'edge.desktop'})}>
        Select Tauri Desktop
      </button>
      <button
        type="button"
        onClick={() =>
          selectEdge?.({
            id: 'step-01',
            $edge: {relations: ['relation-01']},
            relationships: () => [{$relationship: {id: 'relation-01'}}],
          })
        }>
        Select relationship
      </button>
    </div>
  );
}

describe('ArchitectureView client-only seam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => cleanup());

  it('renders a meaningful SSR and pre-hydration fallback', () => {
    render(<ArchitectureView viewId="landscape" />);
    expect(screen.getByRole('status').textContent).toContain('Loading Three-zone landscape');
    expect(screen.getByText('The interactive model loads in the browser.')).toBeTruthy();
  });

  it('provides a written-documentation path if a diagram fails', () => {
    render(<ArchitectureFallback viewId="gateway_runtime" reason="unavailable" />);
    expect(screen.getByRole('alert').textContent).toContain('Governance Gateway is unavailable');
    expect(screen.getByRole('link', {name: 'Open the system map'}).getAttribute('href')).toBe(
      '/docs/system-map',
    );
  });

  it('resolves a clicked relationship through the generated LikeC4 edge wrapper', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const generated = require('../../src/generated/likec4.generated.js') as {
      likec4model: {
        findView: (id: string) => {
          edges: () => Iterable<{
            relationships: () => Iterable<{id: string}>;
          }>;
        };
      };
    };
    const edge = [...generated.likec4model.findView('flow_governed_request_overview').edges()][0];
    const relationship = [...edge.relationships()][0];

    expect(selectionFromDiagramClick('relationship', edge)).toEqual({
      id: relationship.id,
      kind: 'relationship',
    });
  });

  it('sizes a sequence presenter from the rendered sequence bounds', () => {
    const view = {
      $layouted: {
        variant: 'sequence',
        bounds: {width: 4200, height: 420},
        sequenceLayout: {bounds: {width: 1800, height: 600}},
        edges: [],
      },
      isDynamicView: () => true,
      edges: () => [],
    };
    const adapted = adaptArchitectureView({findView: () => view}, 'flow_governed_request_overview');
    const presenterStyle = adapted.presenterStyle as Record<string, number>;

    expect(presenterStyle['--architecture-aspect']).toBe(3);
  });

  it('projects all four plain-language fields for every novice-visible node', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const generated = require('../../src/generated/likec4.generated.js') as {
      likec4model: {
        findView: (id: string) => {
          nodes: () => Iterable<{element: {id: string}}>;
        };
      };
    };
    const noviceViews = [
      'landscape',
      'governance_outcomes',
      ...demoScenes.filter(isArchitectureScene).map((scene) => scene.visual.viewId),
    ];

    for (const viewId of noviceViews) {
      const view = generated.likec4model.findView(viewId);
      for (const node of view.nodes()) {
        const entity = adaptArchitectureSelection(generated.likec4model, viewId, {
          id: node.element.id,
          kind: 'element',
        });
        expect(entity, `${viewId}:${node.element.id}`).not.toBeNull();
        const projection = projectArchitectureAudience(entity!, 'presenter', {});
        expect(projection.audience).toBe('presenter');
        if (projection.audience === 'presenter') {
          expect(projection.role.trim(), `${viewId}:${node.element.id}:Role`).not.toBe('');
          expect(projection.receives).toBeDefined();
          expect(projection.returns).toBeDefined();
          expect(
            projection.cannotDo.length,
            `${viewId}:${node.element.id}:Cannot do`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it('makes every demo architecture scene a canonical dynamic walkthrough', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const generated = require('../../src/generated/likec4.generated.js') as {
      likec4model: {
        findView: (id: string) => {
          isDynamicView: () => boolean;
          edges: () => Iterable<unknown>;
        };
      };
    };
    const architectureScenes = demoScenes.filter(isArchitectureScene);

    expect(architectureScenes).toHaveLength(6);
    for (const scene of architectureScenes) {
      const view = generated.likec4model.findView(scene.visual.viewId);
      expect(
        view.isDynamicView(),
        `${scene.id}:${scene.visual.viewId} should expose a LikeC4 walkthrough`,
      ).toBe(true);
      expect(
        [...view.edges()].length,
        `${scene.id}:${scene.visual.viewId} should have steps`,
      ).toBeGreaterThan(0);
    }
  });

  it('keeps native engineering controls and opens evidence without remounting the diagram', () => {
    let mounts = 0;
    const observedProps: Array<Record<string, unknown>> = [];
    const FakeDiagram = (props: Record<string, unknown>) => (
      <DiagramProbe
        props={props}
        onMount={() => {
          mounts += 1;
          observedProps.push(props);
        }}
      />
    );

    render(
      <ClientArchitectureDiagram
        generated={{ReactLikeC4: FakeDiagram, likeC4Model: architectureFixture()}}
        evidenceLock={{
          repositories: {
            zone1: {
              repositoryUrl: 'https://example.com/zone1.git',
              visibility: 'private',
              commit: 'pinned-commit',
            },
          },
        }}
        viewId="flow_governed_request"
        mode="atlas"
      />,
    );

    expect(screen.getByRole('button', {name: 'Start'})).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Walk this request'})).toBeNull();
    expect(observedProps[0]).toMatchObject({
      browser: true,
      controls: true,
      enableDynamicViewWalkthrough: true,
      fitView: true,
      keepAspectRatio: false,
      fitViewPadding: {top: '76px', right: '28px', bottom: '28px', left: '28px'},
    });
    expect(mounts).toBe(1);

    fireEvent.click(screen.getByRole('button', {name: 'Select Tauri Desktop'}));
    const drawer = screen.getByRole('dialog', {name: 'Evidence for Tauri Desktop'});
    expect(within(drawer).getByText('zone1:desktop/src-tauri/tauri.conf.json')).toBeTruthy();
    expect(drawer.parentElement?.className).not.toContain('withDrawer');
    expect(mounts).toBe(1);

    fireEvent.click(screen.getByRole('button', {name: 'Close evidence'}));
    expect(screen.queryByRole('dialog', {name: 'Evidence for Tauri Desktop'})).toBeNull();
    expect(mounts).toBe(1);

    fireEvent.click(screen.getByRole('button', {name: 'Select relationship'}));
    expect(
      screen.getByRole('dialog', {name: 'Evidence for Published MCP boundary'}),
    ).toBeTruthy();
    expect(mounts).toBe(1);
  });

  it('uses native LikeC4 controls and projects plain-language details for presenters', async () => {
    const observedProps: Array<Record<string, unknown>> = [];
    const FakeDiagram = (props: Record<string, unknown>) => (
      <DiagramProbe props={props} onMount={() => observedProps.push(props)} />
    );

    render(
      <ClientArchitectureDiagram
        generated={{ReactLikeC4: FakeDiagram, likeC4Model: architectureFixture()}}
        evidenceLock={{}}
        viewId="flow_governed_request"
        mode="presenter"
      />,
    );

    await waitFor(() => expect(screen.getByRole('button', {name: 'Start'})).toBeTruthy());
    expect(screen.getByRole('button', {name: 'Diagram'})).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Sequence'})).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Walk this request'})).toBeNull();
    expect(screen.queryByText('Every enterprise request follows the governed path.')).toBeNull();
    expect(observedProps[0]).toMatchObject({
      browser: true,
      controls: true,
      showNavigationButtons: true,
      enableDynamicViewWalkthrough: true,
      fitViewPadding: {top: '76px', right: '28px', bottom: '28px', left: '28px'},
    });

    fireEvent.click(screen.getByRole('button', {name: 'Select Tauri Desktop'}));
    const drawer = screen.getByRole('dialog', {name: 'Details for Tauri Desktop'});
    expect(within(drawer).getByText('Role')).toBeTruthy();
    expect(within(drawer).getByText('Hosts the local user experience.')).toBeTruthy();
    expect(within(drawer).getByText('Receives')).toBeTruthy();
    expect(within(drawer).getByText(/Starts a request — from Clinician/)).toBeTruthy();
    expect(within(drawer).getByText('Returns')).toBeTruthy();
    expect(within(drawer).getByText(/Sends a governed MCP call — to Governance Gateway/)).toBeTruthy();
    expect(within(drawer).getByText('Cannot do')).toBeTruthy();
    expect(within(drawer).getByText('Cannot access enterprise systems directly.')).toBeTruthy();
    expect(within(drawer).queryByText(/zone1:/)).toBeNull();
    expect(within(drawer).queryByRole('link')).toBeNull();
    expect(document.activeElement).toBe(within(drawer).getByRole('button', {name: 'Close details'}));

    fireEvent.keyDown(window, {key: 'Escape'});
    expect(screen.queryByRole('dialog', {name: 'Details for Tauri Desktop'})).toBeNull();
    expect(screen.getByRole('button', {name: 'Start'})).toBeTruthy();
    expect(walkthroughApi.startWalkthrough).not.toHaveBeenCalled();
  });

  it('treats step as a one-based dynamic walkthrough step', async () => {
    const FakeDiagram = (props: Record<string, unknown>) => (
      <DiagramProbe props={props} onMount={() => undefined} />
    );
    render(
      <ClientArchitectureDiagram
        generated={{ReactLikeC4: FakeDiagram, likeC4Model: architectureFixture()}}
        evidenceLock={{}}
        viewId="flow_governed_request"
        mode="presenter"
        step={3}
      />,
    );

    await waitFor(() => expect(walkthroughApi.startWalkthrough).toHaveBeenCalledTimes(1));
    expect(walkthroughApi.stopWalkthrough).toHaveBeenCalledTimes(1);
    expect(walkthroughApi.walkthroughStep).toHaveBeenCalledTimes(2);
    expect(walkthroughApi.walkthroughStep).toHaveBeenNthCalledWith(1, 'next');
    expect(walkthroughApi.walkthroughStep).toHaveBeenNthCalledWith(2, 'next');
  });
});
