import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {demoScenes, isArchitectureScene, type DemoScene} from './scenes';

export function sceneIndexFromHash(
  hash: string,
  scenes: readonly DemoScene[] = demoScenes,
): number {
  let id = hash.replace(/^#/, '');
  try {
    id = decodeURIComponent(id);
  } catch {
    return 0;
  }
  const index = scenes.findIndex((scene) => scene.id === id);
  return index >= 0 ? index : 0;
}

export function clampSceneIndex(index: number, sceneCount = demoScenes.length): number {
  const finiteIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  return Math.min(Math.max(finiteIndex, 0), Math.max(0, sceneCount - 1));
}

export function sceneIndexForKey(
  key: string,
  current: number,
  sceneCount = demoScenes.length,
): number | null {
  switch (key) {
    case 'ArrowRight':
    case ' ':
    case 'PageDown':
      return clampSceneIndex(current + 1, sceneCount);
    case 'ArrowLeft':
    case 'PageUp':
      return clampSceneIndex(current - 1, sceneCount);
    case 'Home':
      return 0;
    case 'End':
      return Math.max(0, sceneCount - 1);
    default:
      return null;
  }
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(
    target.closest(
      'a, button, input, select, textarea, summary, [contenteditable="true"], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function sceneExitHref(scene: DemoScene, atlasUrl: string): string {
  return isArchitectureScene(scene) ? `${atlasUrl}#${scene.visual.viewId}` : atlasUrl;
}

interface PresenterControllerOptions {
  readonly atlasUrl: string;
  readonly scenes?: readonly DemoScene[];
  readonly navigateToExit?: (href: string) => void;
}

export interface PresenterController {
  readonly scene: DemoScene;
  readonly sceneIndex: number;
  readonly sceneCount: number;
  readonly exitHref: string;
  readonly goTo: (index: number) => void;
  readonly previous: () => void;
  readonly next: () => void;
}

function replaceSceneHash(scene: DemoScene): void {
  const url = new URL(window.location.href);
  url.hash = scene.id;
  window.history.replaceState(null, '', url);
}

function defaultNavigateToExit(href: string): void {
  window.location.assign(href);
}

/**
 * Owns presenter navigation and stable hashes. The page is only a
 * projection of this state and ArchitectureView keeps its own walkthrough.
 */
export function usePresenterController({
  atlasUrl,
  scenes = demoScenes,
  navigateToExit = defaultNavigateToExit,
}: PresenterControllerOptions): PresenterController {
  if (scenes.length === 0) {
    throw new Error('The presenter requires at least one scene.');
  }

  const [sceneIndex, setSceneIndex] = useState(0);
  const sceneIndexRef = useRef(sceneIndex);

  useEffect(() => {
    sceneIndexRef.current = sceneIndex;
  }, [sceneIndex]);

  const commitScene = useCallback(
    (requestedIndex: number): void => {
      const nextIndex = clampSceneIndex(requestedIndex, scenes.length);
      sceneIndexRef.current = nextIndex;
      setSceneIndex(nextIndex);
      replaceSceneHash(scenes[nextIndex]);
    },
    [scenes],
  );

  const goTo = useCallback(
    (nextIndex: number): void => {
      commitScene(nextIndex);
    },
    [commitScene],
  );

  useEffect(() => {
    const syncHash = (): void => {
      const nextIndex = sceneIndexFromHash(window.location.hash, scenes);
      sceneIndexRef.current = nextIndex;
      setSceneIndex(nextIndex);
    };
    syncHash();
    if (!window.location.hash) {
      replaceSceneHash(scenes[0]);
    }
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [scenes]);

  const scene = scenes[sceneIndex];
  const exitHref = useMemo(() => sceneExitHref(scene, atlasUrl), [atlasUrl, scene]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        navigateToExit(exitHref);
        return;
      }
      if (isInteractiveTarget(event.target)) {
        return;
      }
      const nextIndex = sceneIndexForKey(event.key, sceneIndexRef.current, scenes.length);
      if (nextIndex !== null) {
        event.preventDefault();
        commitScene(nextIndex);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commitScene, exitHref, navigateToExit, scenes.length]);

  return {
    scene,
    sceneIndex,
    sceneCount: scenes.length,
    exitHref,
    goTo,
    previous: () => goTo(sceneIndex - 1),
    next: () => goTo(sceneIndex + 1),
  };
}
