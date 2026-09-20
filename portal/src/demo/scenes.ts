import type {ArchitectureViewId} from '../architecture/views';

export type ProductVisualId = 'nhs-clinical-workspace';

export type StoryStatementMotif = 'origin' | 'tension' | 'question' | 'handoff';

interface DemoSceneBase {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly narrative: string;
  readonly presenterCue?: string;
  readonly guidePath?: string;
}

export interface ArchitectureDemoScene extends DemoSceneBase {
  readonly visual: {
    readonly kind: 'architecture';
    readonly viewId: ArchitectureViewId;
  };
}

export interface ProductImageDemoScene extends DemoSceneBase {
  readonly visual: {
    readonly kind: 'product-image';
    readonly visualId: ProductVisualId;
  };
}

/**
 * A text-led beat used to establish the story without introducing another
 * architecture model. Motifs are presentational cues, not system topology.
 */
export interface StatementDemoScene extends DemoSceneBase {
  readonly visual: {
    readonly kind: 'statement';
    readonly motif: StoryStatementMotif;
  };
}

export type DemoScene = ArchitectureDemoScene | ProductImageDemoScene | StatementDemoScene;

/**
 * Presenter content owns only ordering, scenario framing and speaker cues.
 * Architecture facts stay in LikeC4; executable NHS behaviour stays in the
 * NHS Care demo guide; product-image provenance stays in productVisuals.ts.
 */
export const demoScenes: readonly DemoScene[] = [
  {
    id: 'small-models',
    eyebrow: 'Where the idea began',
    title: 'We started with small models',
    narrative:
      'We were fine-tuning small language models for specific domains. The appeal was clear: run close to the person, interpret intent locally, and avoid a remote model for every interaction.',
    visual: {kind: 'statement', motif: 'origin'},
  },
  {
    id: 'useful-work-lives-elsewhere',
    eyebrow: 'The practical limit',
    title: 'But useful work lives elsewhere',
    narrative:
      'The model may be on the device, but the records, documents, services, and deeper reasoning that make enterprise work useful usually are not.',
    visual: {kind: 'statement', motif: 'tension'},
  },
  {
    id: 'governed-access-question',
    eyebrow: 'The design question',
    title: 'Can local intelligence have enterprise reach without unrestricted access?',
    narrative:
      'We wanted to keep intent and interaction close to the user while making every journey to enterprise capability explicit, controlled, and accountable.',
    visual: {kind: 'statement', motif: 'question'},
  },
  {
    id: 'one-governed-door',
    eyebrow: 'The architectural answer',
    title: 'Keep intent local. Govern every journey outward.',
    narrative:
      'Begin with one memorable rule: enterprise capability is reached through a single governed door, never through a model shortcut.',
    visual: {kind: 'architecture', viewId: 'flow_permitted_path_walkthrough'},
  },
  {
    id: 'one-governed-request',
    eyebrow: 'The main journey',
    title: 'One useful request in six beats',
    narrative:
      'Now follow a single useful request at story level. The decision moment introduces the other paths without turning the slide into an implementation diagram.',
    visual: {kind: 'architecture', viewId: 'flow_governed_request_overview'},
  },
  {
    id: 'governed-definition',
    eyebrow: 'Integration Definitions · JSON to governed use case',
    title: 'Describe a governed use case in JSON',
    narrative:
      'The next challenge was making new use cases repeatable without rebuilding every Edge Experience or hiding important choices in application code.',
    visual: {kind: 'architecture', viewId: 'flow_integration_definition_walkthrough'},
  },
  {
    id: 'reusable-platform',
    eyebrow: 'Reuse without shortcuts',
    title: 'One platform, many governed use cases',
    narrative:
      'The same pattern can support different experiences and organisations without changing the safety rule. The diagram distinguishes what exists today from what is still evolving.',
    visual: {kind: 'architecture', viewId: 'deployment_reuse_walkthrough'},
  },
  {
    id: 'two-audiences',
    eyebrow: 'FastMCP Apps · deliberate projection',
    title: 'Rich for the person. Small for the model.',
    narrative:
      'A chat answer and a working interface need different amounts of information. Treating them as one payload makes the small-model context do work it should not.',
    visual: {kind: 'architecture', viewId: 'flow_projection_overview'},
  },
  {
    id: 'bounded-reasoning',
    eyebrow: 'Reasoning Plane · help without unrestricted access',
    title: 'Borrow deeper reasoning, not the whole record',
    narrative:
      'Sometimes the local model needs deeper help. The design challenge is borrowing that help without handing over identity, whole records, or unrestricted access.',
    visual: {kind: 'architecture', viewId: 'flow_reasoning_walkthrough'},
  },
  {
    id: 'live-application',
    eyebrow: 'Make the story concrete',
    title: 'Watch the governed path live',
    narrative:
      'Return to the synthetic NHS workspace and look for the story beats you have just seen. The demo guide is explicit about what this workflow proves—and what it does not.',
    presenterCue:
      'Open the NHS Care demo guide, switch to the desktop application, and run the first governed-workspace workflow.',
    guidePath: '/docs/demos/nhs-care',
    visual: {kind: 'statement', motif: 'handoff'},
  },
] as const satisfies readonly DemoScene[];

export function isArchitectureScene(scene: DemoScene): scene is ArchitectureDemoScene {
  return scene.visual.kind === 'architecture';
}
