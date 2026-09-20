import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import evidenceLock from '../../../architecture/evidence.lock.json';
import {
  clampSceneIndex,
  isInteractiveTarget,
  sceneExitHref,
  sceneIndexForKey,
  sceneIndexFromHash,
  usePresenterController,
} from '../../src/demo/presenterController';
import {productVisuals, resolveProductVisualProvenance} from '../../src/demo/productVisuals';
import {demoScenes} from '../../src/demo/scenes';

afterEach(() => {
  cleanup();
});

function PresenterHarness({
  navigateToExit = vi.fn(),
}: {
  readonly navigateToExit?: (href: string) => void;
}) {
  const presenter = usePresenterController({
    atlasUrl: '/atlas',
    navigateToExit,
  });
  return (
    <div>
      <output data-testid="scene">{presenter.scene.id}</output>
      <button type="button" onClick={presenter.next}>
        Manual next
      </button>
    </div>
  );
}

describe('demo scenes', () => {
  it('defines the approved ten-scene story without a second architecture model', () => {
    expect(demoScenes).toHaveLength(10);
    expect(demoScenes.map((scene) => scene.id)).toEqual([
      'small-models',
      'useful-work-lives-elsewhere',
      'governed-access-question',
      'one-governed-door',
      'one-governed-request',
      'governed-definition',
      'reusable-platform',
      'two-audiences',
      'bounded-reasoning',
      'live-application',
    ]);
    expect(demoScenes.map((scene) => scene.visual)).toEqual([
      {kind: 'statement', motif: 'origin'},
      {kind: 'statement', motif: 'tension'},
      {kind: 'statement', motif: 'question'},
      {kind: 'architecture', viewId: 'flow_permitted_path_walkthrough'},
      {kind: 'architecture', viewId: 'flow_governed_request_overview'},
      {kind: 'architecture', viewId: 'flow_integration_definition_walkthrough'},
      {kind: 'architecture', viewId: 'deployment_reuse_walkthrough'},
      {kind: 'architecture', viewId: 'flow_projection_overview'},
      {kind: 'architecture', viewId: 'flow_reasoning_walkthrough'},
      {kind: 'statement', motif: 'handoff'},
    ]);
    expect(demoScenes.some((scene) => scene.visual.kind === 'product-image')).toBe(false);
    expect(demoScenes.at(-1)?.guidePath).toBe('/docs/demos/nhs-care');
    expect(JSON.stringify(demoScenes)).not.toMatch(/maturity|verification|evidence|relationship/i);
  });

  it('resolves product provenance through the evidence lock rather than copying a commit', () => {
    const visual = productVisuals['nhs-clinical-workspace'];
    const provenance = resolveProductVisualProvenance(visual, evidenceLock);

    expect(visual.imagePath).toBe('/img/demo/nhs-clinical-workspace.png');
    expect(provenance).toHaveLength(2);
    expect(provenance.every((item) => item.accessRequired && item.href)).toBe(true);
    expect(provenance.every((item) => item.href?.includes(evidenceLock.repositories.zone1.commit))).toBe(
      true,
    );
  });

  it('ships the sanitised NHS harness capture as a non-empty PNG', () => {
    const capturePath = join(process.cwd(), 'static/img/demo/nhs-clinical-workspace.png');
    const capture = readFileSync(capturePath);
    const signature = capture.subarray(0, 8);
    const visual = productVisuals['nhs-clinical-workspace'];

    expect(statSync(capturePath).size).toBeGreaterThan(10_000);
    expect([...signature]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(capture.readUInt32BE(16)).toBe(visual.intrinsicWidth);
    expect(capture.readUInt32BE(20)).toBe(visual.intrinsicHeight);
  });
});

describe('presenter navigation', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/demo');
  });

  it('resolves stable direct-link hashes and malformed hashes safely', () => {
    expect(sceneIndexFromHash('#bounded-reasoning')).toBe(8);
    expect(sceneIndexFromHash('#unknown')).toBe(0);
    expect(sceneIndexFromHash('#%E0%A4%A')).toBe(0);
    expect(sceneIndexFromHash('')).toBe(0);
  });

  it('supports scene keys and clamps at both ends', () => {
    expect(sceneIndexForKey('ArrowRight', 0)).toBe(1);
    expect(sceneIndexForKey(' ', 1)).toBe(2);
    expect(sceneIndexForKey('ArrowLeft', 2)).toBe(1);
    expect(sceneIndexForKey('Home', 4)).toBe(0);
    expect(sceneIndexForKey('End', 0)).toBe(demoScenes.length - 1);
    expect(sceneIndexForKey('a', 0)).toBeNull();
    expect(clampSceneIndex(-1)).toBe(0);
    expect(clampSceneIndex(999)).toBe(demoScenes.length - 1);
    expect(clampSceneIndex(Number.NaN)).toBe(0);
  });

  it('builds a contextual atlas exit for architecture scenes only', () => {
    expect(sceneExitHref(demoScenes[3], '/atlas')).toBe(
      '/atlas#flow_permitted_path_walkthrough',
    );
    expect(sceneExitHref(demoScenes[0], '/atlas')).toBe('/atlas');
    expect(sceneExitHref(demoScenes[9], '/atlas')).toBe('/atlas');
  });

  it('treats all focusable controls as owned keyboard targets', () => {
    const button = document.createElement('button');
    const link = document.createElement('a');
    const plain = document.createElement('div');
    expect(isInteractiveTarget(button)).toBe(true);
    expect(isInteractiveTarget(link)).toBe(true);
    expect(isInteractiveTarget(plain)).toBe(false);
  });
});

describe('presenter controller', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/demo');
  });

  it('keeps scene changes manual and writes a stable hash', () => {
    render(<PresenterHarness />);

    fireEvent.click(screen.getByRole('button', {name: 'Manual next'}));
    expect(screen.getByTestId('scene').textContent).toBe('useful-work-lives-elsewhere');
    expect(window.location.hash).toBe('#useful-work-lives-elsewhere');
  });

  it('does not steal navigation keys from an interactive target', () => {
    render(<PresenterHarness />);
    const manualNext = screen.getByRole('button', {name: 'Manual next'});

    fireEvent.keyDown(manualNext, {key: 'ArrowRight'});

    expect(screen.getByTestId('scene').textContent).toBe('small-models');
    expect(window.location.hash).toBe('#small-models');
  });

  it('uses the current architecture view when Escape exits', () => {
    const navigateToExit = vi.fn();
    window.history.replaceState(null, '', '/demo#one-governed-door');
    render(<PresenterHarness navigateToExit={navigateToExit} />);

    fireEvent.keyDown(window, {key: 'Escape'});

    expect(navigateToExit).toHaveBeenCalledWith('/atlas#flow_permitted_path_walkthrough');
  });
});
