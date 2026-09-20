import Layout from '@theme/Layout';
import {useEffect, useMemo, useState, type ReactNode} from 'react';

import {
  architectureViews,
  isArchitectureViewId,
  type ArchitectureViewId,
} from '../architecture/views';
import ArchitectureView from '../components/ArchitectureView';
import styles from './atlas.module.css';

const groups = ['System', 'Zones', 'Flows', 'Deployments'] as const;

export default function AtlasPage(): ReactNode {
  const [viewId, setViewId] = useState<ArchitectureViewId>('landscape');

  useEffect(() => {
    const selectFromHash = (): void => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (isArchitectureViewId(hash)) {
        setViewId(hash);
      }
    };
    selectFromHash();
    window.addEventListener('hashchange', selectFromHash);
    return () => window.removeEventListener('hashchange', selectFromHash);
  }, []);

  const selected = useMemo(
    () => architectureViews.find(({id}) => id === viewId) ?? architectureViews[0],
    [viewId],
  );

  const selectView = (next: ArchitectureViewId): void => {
    setViewId(next);
    window.history.replaceState(null, '', `#${next}`);
  };

  return (
    <Layout title="Architecture atlas" description="Explore the canonical architecture model.">
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Interactive architecture atlas</p>
            <h1>Start wide. Follow the boundary. Inspect the proof.</h1>
          </div>
          <p>
            Select a stable view, then open elements and relationships for model-owned metadata and
            evidence. Status and verification are separate dimensions.
          </p>
        </header>

        <div className={styles.workspace}>
          <aside className={styles.navigator} aria-label="Architecture views">
            <label className={styles.mobileSelect}>
              <span>Architecture view</span>
              <select
                value={viewId}
                onChange={(event) => selectView(event.target.value as ArchitectureViewId)}>
                {architectureViews.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.label}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.desktopNav}>
              {groups.map((group) => (
                <section key={group}>
                  <h2>{group}</h2>
                  {architectureViews
                    .filter((view) => view.group === group)
                    .map((view) => (
                      <button
                        key={view.id}
                        type="button"
                        className={view.id === viewId ? styles.active : undefined}
                        aria-pressed={view.id === viewId}
                        onClick={() => selectView(view.id)}>
                        {view.label}
                      </button>
                    ))}
                </section>
              ))}
            </div>
          </aside>

          <section className={styles.canvas} aria-labelledby="selected-view">
            <div className={styles.canvasHeader}>
              <div>
                <span>Canonical view</span>
                <h2 id="selected-view">{selected.label}</h2>
              </div>
              <a href={`#${viewId}`} aria-label={`Permanent link to ${selected.label}`}>
                #{viewId}
              </a>
            </div>
            <ArchitectureView key={viewId} viewId={viewId} mode="atlas" />
          </section>
        </div>

        <section className={styles.legend} aria-labelledby="legend-title">
          <div>
            <p className={styles.kicker}>Two-dimensional status</p>
            <h2 id="legend-title">A claim is not its proof</h2>
          </div>
          <div className={styles.legendGroups}>
            <div>
              <strong>Maturity</strong>
              <p>Implemented · Prototype · Planned · Scaffold · External</p>
            </div>
            <div>
              <strong>Verification</strong>
              <p>Live · Automated · Source · Design</p>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
