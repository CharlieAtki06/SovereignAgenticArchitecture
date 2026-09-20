import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import {useEffect, type ReactNode} from 'react';

import ArchitectureView from '../components/ArchitectureView';
import ProductVisual from '../demo/ProductVisual';
import StoryStatement from '../demo/StoryStatement';
import {usePresenterController} from '../demo/presenterController';
import {productVisuals} from '../demo/productVisuals';
import {demoScenes, isArchitectureScene} from '../demo/scenes';
import styles from './demo.module.css';

export default function DemoPage(): ReactNode {
  const atlasUrl = useBaseUrl('/atlas');
  const presenter = usePresenterController({atlasUrl});
  const {scene, sceneIndex, sceneCount} = presenter;
  const guidePath =
    scene.guidePath ??
    (scene.visual.kind === 'product-image'
      ? productVisuals[scene.visual.visualId].guidePath
      : undefined);
  const guideUrl = useBaseUrl(guidePath ?? '/');

  useEffect(() => {
    document.body.classList.add('presenter-active');
    return () => document.body.classList.remove('presenter-active');
  }, []);

  return (
    <Layout
      title={`Demo · ${scene.title}`}
      description="A story-first path from local models to governed enterprise capability"
      noFooter>
      <main className={styles.presenter} data-presenter-scene={scene.id}>
        <header className={styles.topbar}>
          <Link to="/" className={styles.brand} aria-label="Architecture portal home">
            SAA <span>/ demo</span>
          </Link>
          <div className={styles.progressText} aria-live="polite">
            <span>{String(sceneIndex + 1).padStart(2, '0')}</span>
            <span aria-hidden="true">/</span>
            <span>{String(sceneCount).padStart(2, '0')}</span>
          </div>
          <Link to={presenter.exitHref} className={styles.exit}>
            Exit to atlas <kbd>Esc</kbd>
          </Link>
        </header>

        <div className={styles.progressTrack} data-presenter-progress aria-hidden="true">
          <span style={{width: `${((sceneIndex + 1) / sceneCount) * 100}%`}} />
        </div>

        <section
          className={styles.stage}
          data-presenter-kind={scene.visual.kind}
          aria-labelledby="presenter-title">
          <div className={styles.copy}>
            <div className={styles.heading}>
              <p className={styles.eyebrow}>{scene.eyebrow}</p>
              <h1 id="presenter-title">{scene.title}</h1>
            </div>
            <div className={styles.story}>
              <p className={styles.narrative}>{scene.narrative}</p>
              {scene.presenterCue && (
                <aside className={styles.presenterCue} aria-label="Presenter cue">
                  <strong>Presenter cue</strong>
                  <span>{scene.presenterCue}</span>
                </aside>
              )}
              {guidePath && (
                <Link className={styles.guideLink} to={guideUrl}>
                  Open the NHS Care demo guide <span aria-hidden="true">↗</span>
                </Link>
              )}
            </div>
          </div>

          <div className={styles.visual} data-presenter-visual key={scene.id}>
            {isArchitectureScene(scene) ? (
              <ArchitectureView viewId={scene.visual.viewId} mode="presenter" />
            ) : scene.visual.kind === 'statement' ? (
              <StoryStatement motif={scene.visual.motif} />
            ) : (
              <ProductVisual visualId={scene.visual.visualId} />
            )}
          </div>
        </section>

        <nav className={styles.controls} aria-label="Demo scenes">
          <button
            type="button"
            onClick={presenter.previous}
            disabled={sceneIndex === 0}
            aria-label="Previous scene">
            <span aria-hidden="true">←</span> Previous scene
          </button>

          <div className={styles.dots} role="group" aria-label="Choose a scene">
            {demoScenes.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === sceneIndex ? styles.currentDot : undefined}
                aria-label={`Go to scene ${index + 1}: ${item.title}`}
                aria-current={index === sceneIndex ? 'step' : undefined}
                onClick={() => presenter.goTo(index)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={presenter.next}
            disabled={sceneIndex === sceneCount - 1}
            aria-label="Next scene">
            Next scene <span aria-hidden="true">→</span>
          </button>
        </nav>
      </main>
    </Layout>
  );
}
