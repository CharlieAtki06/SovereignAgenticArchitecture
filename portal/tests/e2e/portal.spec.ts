import AxeBuilder from '@axe-core/playwright';
import {expect, test} from '@playwright/test';

import {demoScenes, isArchitectureScene} from '../../src/demo/scenes';

const architectureScenes = demoScenes.filter(isArchitectureScene);

test('atlas loads the canonical view and supports direct view links', async ({page}) => {
  await page.goto('atlas#flow_governed_request');

  await expect(page.getByRole('heading', {name: 'Governed request'})).toBeVisible();
  await expect(page.locator('[data-architecture-view="flow_governed_request"]')).toBeVisible();
  await expect(page.getByText('Maturity', {exact: true})).toBeVisible();
  await expect(page.getByText('Verification', {exact: true})).toBeVisible();
  await expect(page.getByText('Stop', {exact: true})).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Start'})).toBeVisible();
  await expect(
    page.getByText(/Return only authorised audience projections and lifecycle metadata/),
  ).toBeVisible();

  await page.getByRole('button', {name: 'Start'}).click();
  await expect(page.getByRole('button', {name: 'Stop'})).toBeVisible();
});

test('presenter supports direct steps and keyboard navigation', async ({page}) => {
  await page.goto('demo#governed-definition');
  await expect(page.getByRole('heading', {name: 'Describe a governed use case in JSON'})).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#reusable-platform$/);
  await expect(page.getByRole('heading', {name: 'One platform, many governed use cases'})).toBeVisible();

  await page.keyboard.press('Home');
  await expect(page).toHaveURL(/#small-models$/);
  await page.keyboard.press('End');
  await expect(page).toHaveURL(/#live-application$/);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/atlas$/);
});

test('presenter keeps scene navigation separate from the diagram walkthrough', async ({page}) => {
  await page.goto('demo#one-governed-request');

  await expect(page.getByRole('button', {name: 'Diagram'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Sequence'})).toBeVisible();
  await page.getByRole('button', {name: 'Start'}).click();
  await expect(page).toHaveURL(/#one-governed-request$/);
  await expect(page.getByRole('button', {name: 'Stop'})).toBeVisible();

  await page.getByRole('button', {name: 'Next scene'}).click();
  await expect(page).toHaveURL(/#governed-definition$/);
  await expect(page.getByRole('heading', {name: 'Describe a governed use case in JSON'})).toBeVisible();
});

test('every demo architecture scene exposes the native playable walkthrough', async ({page}) => {
  expect(architectureScenes).toHaveLength(6);

  for (const scene of architectureScenes) {
    await page.goto(`demo#${scene.id}`);
    const frame = page.locator(`[data-architecture-view="${scene.visual.viewId}"]`);

    await expect(frame, `${scene.id} should render its canonical view`).toBeVisible();
    await expect(frame.getByRole('button', {name: 'Diagram'})).toBeVisible();
    await expect(frame.getByRole('button', {name: 'Sequence'})).toBeVisible();
    await expect(frame.getByRole('button', {name: 'Start'})).toBeVisible();

    await frame.getByRole('button', {name: 'Start'}).click();
    await expect(frame.getByRole('button', {name: 'Stop'})).toBeVisible();
  }
});

test('presenter Escape closes transient layers before exiting', async ({
  page,
}) => {
  await page.goto('demo#one-governed-request');

  await page.locator('.react-flow__node').first().click();
  const details = page.locator('[role="dialog"][aria-label^="Details for"]');
  await expect(details).toBeVisible();
  await expect(details.getByRole('button', {name: 'Close details'})).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(details).toHaveCount(0);
  await expect(page).toHaveURL(/#one-governed-request$/);

  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/atlas#flow_governed_request_overview$/);
});

test('presenter respects focused controls and exits architecture scenes contextually', async ({page}) => {
  await page.goto('demo#one-governed-door');
  const nextScene = page.getByRole('button', {name: 'Next scene'});
  await nextScene.focus();

  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#one-governed-door$/);

  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/atlas#flow_permitted_path_walkthrough$/);
});

test('presenter uses text-led story scenes and exposes the NHS guide at the live handoff', async ({
  page,
}) => {
  await page.goto('demo#small-models');

  await expect(page.locator('[data-story-statement="origin"]')).toBeVisible();
  await expect(page.locator('[data-product-visual]')).toHaveCount(0);
  await expect(page.locator('.react-flow')).toHaveCount(0);
  await expect(page.getByRole('link', {name: /Open the NHS Care demo guide/})).toHaveCount(0);

  await page.goto('demo#live-application');
  await expect(page.locator('[data-story-statement="handoff"]')).toBeVisible();
  await expect(page.getByRole('link', {name: /Open the NHS Care demo guide/})).toBeVisible();
  await expect(page.getByRole('link', {name: /Exit to atlas/})).toHaveAttribute(
    'href',
    /\/atlas$/,
  );
});

test('presenter remains readable with manual controls and reduced motion', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('demo#small-models');

  await expect(page.getByRole('heading', {name: 'We started with small models'})).toBeVisible();
  await expect(page.getByRole('button', {name: /Play story|Pause story/})).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Next scene'})).toBeVisible();
  await expect(page.locator('[data-presenter-progress] span')).toHaveCSS(
    'transition-duration',
    '0s',
  );
  await expect(page.locator('[data-presenter-visual]')).toHaveCSS('animation-name', 'none');
  await expect(page).toHaveURL(/#small-models$/);
});

test('presenter stops manual scene navigation at the final scene', async ({page}) => {
  await page.goto('demo#live-application');

  await expect(page.getByRole('button', {name: 'Next scene'})).toBeDisabled();
  await expect(page).toHaveURL(/#live-application$/);
});

test('presenter diagram nodes meaningfully occupy the visible canvas', async ({
  page,
}) => {
  await page.goto('demo#one-governed-door');
  const frame = page.locator('[data-architecture-view="flow_permitted_path_walkthrough"]');
  const canvas = frame.locator('.react-flow');
  const nodes = canvas.locator('.react-flow__node');

  await expect(canvas).toBeVisible();
  await expect(nodes.first()).toBeVisible();
  await expect.poll(() => nodes.count()).toBeGreaterThan(2);

  const measureOccupancy = async () => {
    const canvasBox = await canvas.boundingBox();
    const nodeBoxes = await nodes.evaluateAll((elements) =>
      elements
        .map((node) => node.getBoundingClientRect().toJSON())
        .filter((box) => box.width > 0 && box.height > 0),
    );
    if (!canvasBox || nodeBoxes.length === 0 || canvasBox.width === 0 || canvasBox.height === 0) {
      return {width: 0, height: 0};
    }
    const left = Math.max(canvasBox.x, Math.min(...nodeBoxes.map((box) => box.left)));
    const right = Math.min(
      canvasBox.x + canvasBox.width,
      Math.max(...nodeBoxes.map((box) => box.right)),
    );
    const top = Math.max(canvasBox.y, Math.min(...nodeBoxes.map((box) => box.top)));
    const bottom = Math.min(
      canvasBox.y + canvasBox.height,
      Math.max(...nodeBoxes.map((box) => box.bottom)),
    );
    return {
      width: Math.max(0, right - left) / canvasBox.width,
      height: Math.max(0, bottom - top) / canvasBox.height,
    };
  };

  await expect
    .poll(async () => (await measureOccupancy()).width)
    .toBeGreaterThan(0.45);
  await expect
    .poll(async () => (await measureOccupancy()).height)
    .toBeGreaterThan(0.1);
});

test('story architecture remains legible at desktop presentation size', async ({page}) => {
  test.skip(test.info().project.name === 'mobile-chromium', 'desktop legibility assertion');
  const scenes = [
    ['one-governed-request', 'flow_governed_request_overview'],
    ['governed-definition', 'flow_integration_definition_walkthrough'],
    ['reusable-platform', 'deployment_reuse_walkthrough'],
    ['bounded-reasoning', 'flow_reasoning_walkthrough'],
  ] as const;

  for (const [sceneId, viewId] of scenes) {
    await page.goto(`demo#${sceneId}`);
    const nodes = page.locator(`[data-architecture-view="${viewId}"] .react-flow__node`);
    await expect(nodes.first(), `${sceneId} should render architecture nodes`).toBeVisible();
    const smallest = await nodes.evaluateAll((elements) => {
      const boxes = elements.map((element) => element.getBoundingClientRect());
      return {
        width: Math.min(...boxes.map((box) => box.width)),
        height: Math.min(...boxes.map((box) => box.height)),
      };
    });
    expect(smallest.width, `${sceneId} node width`).toBeGreaterThan(100);
    expect(smallest.height, `${sceneId} node height`).toBeGreaterThan(50);
  }
});

test('architecture scenes give the canonical diagram most of the presenter canvas', async ({
  page,
}) => {
  test.skip(test.info().project.name === 'mobile-chromium', 'desktop layout assertion');
  await page.goto('demo#one-governed-request');

  const measurements = await page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>(
      '[data-architecture-view="flow_governed_request_overview"]',
    );
    const box = frame?.getBoundingClientRect();
    return {
      width: box?.width ?? 0,
      height: box?.height ?? 0,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });

  expect(measurements.width).toBeGreaterThan(measurements.viewportWidth * 0.8);
  expect(measurements.height).toBeGreaterThan(measurements.viewportHeight * 0.5);
});

test('evidence opens without resizing or refitting the diagram', async ({page}) => {
  await page.goto('atlas#flow_governed_request');
  const flow = page.locator('.react-flow');
  const viewport = page.locator('.react-flow__viewport');
  await expect(flow).toBeVisible();
  await page.waitForTimeout(500);

  const before = {
    box: await flow.boundingBox(),
    transform: await viewport.evaluate((element) => getComputedStyle(element).transform),
  };
  await page.locator('.react-flow__node').first().evaluate((element: HTMLElement) => element.click());

  const drawer = page.locator('[role="dialog"][aria-label^="Evidence for"]');
  await expect(drawer).toBeVisible();
  expect(await drawer.evaluate((element) => getComputedStyle(element).position)).toBe('absolute');
  await page.waitForTimeout(300);
  const after = {
    box: await flow.boundingBox(),
    transform: await viewport.evaluate((element) => getComputedStyle(element).transform),
  };

  expect(after.box?.width).toBeCloseTo(before.box?.width ?? 0, 1);
  expect(after.box?.height).toBeCloseTo(before.box?.height ?? 0, 1);
  expect(after.transform).toBe(before.transform);
});

test('primary pages have no automatically detectable accessibility violations', async ({page}) => {
  await page.goto('atlas');
  await expect(page.locator('[data-architecture-view="landscape"]')).toBeVisible();
  const results = await new AxeBuilder({page})
    .exclude('[data-architecture-view]')
    .analyze();
  expect(results.violations).toEqual([]);
});

test('the complete presenter UI has no automatically detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('demo#small-models');
  await expect(page.locator('[data-story-statement="origin"]')).toBeVisible();

  const results = await new AxeBuilder({page}).analyze();
  expect(results.violations).toEqual([]);
});

test('architecture presenter controls and details have no detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('demo#one-governed-request');
  await expect(page.locator('[data-architecture-view="flow_governed_request_overview"]')).toBeVisible();

  const initialResults = await new AxeBuilder({page}).exclude('.react-flow').analyze();
  expect(initialResults.violations).toEqual([]);

  await page.locator('.react-flow__node').first().click();
  await expect(page.locator('[role="dialog"][aria-label^="Details for"]')).toBeVisible();
  const detailResults = await new AxeBuilder({page}).exclude('.react-flow').analyze();
  expect(detailResults.violations).toEqual([]);
});

test('mobile presenter uses a compact diagram frame without horizontal overflow', async ({page}) => {
  test.skip(test.info().project.name !== 'mobile-chromium', 'mobile layout assertion');
  await page.goto('demo#one-governed-door');
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  await expect.poll(() => page.locator('.react-flow__node').count()).toBeGreaterThan(2);

  const measurements = await page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>(
      '[data-architecture-view="flow_permitted_path_walkthrough"]',
    );
    const canvas = frame?.querySelector<HTMLElement>('.react-flow');
    return {
      frameHeight: frame?.getBoundingClientRect().height ?? 0,
      viewportHeight: window.innerHeight,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      canvasHeight: canvas?.getBoundingClientRect().height ?? 0,
    };
  });

  expect(measurements.scrollWidth).toBe(measurements.clientWidth);
  expect(measurements.frameHeight).toBeLessThan(measurements.viewportHeight * 0.55);
  expect(measurements.canvasHeight).toBeGreaterThan(240);
  await expect(page.getByRole('button', {name: 'Next scene'})).toBeVisible();
});

test('atlas remains usable with reduced motion', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('atlas#client_landscape');
  await expect(page.locator('[data-architecture-view="client_landscape"]')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Edge Experiences'})).toBeVisible();
});
