import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import type {ReactNode} from 'react';

import ArchitectureView from '../components/ArchitectureView';
import styles from './index.module.css';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout title="Architecture portal" description={siteConfig.tagline}>
      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroContent}>
            <p className={styles.kicker}>Sovereign agentic architecture</p>
            <h1>Local agency. Deterministic governance. Deliberate disclosure.</h1>
            <p className={styles.lede}>
              A code-backed map of how Edge experiences reach enterprise intelligence through one
              governed boundary—without creating a direct path around it.
            </p>
            <div className={styles.heroActions}>
              <Link className="button button--primary button--lg" to="/atlas">
                Explore the atlas
              </Link>
              <Link className="button button--secondary button--lg" to="/demo">
                Start the talk-through
              </Link>
            </div>
          </div>
          <div className={styles.heroMap}>
            <ArchitectureView viewId="landscape" mode="embedded" />
          </div>
        </section>

        <section className={styles.journeys} aria-labelledby="choose-journey">
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>One source, two journeys</p>
            <h2 id="choose-journey">Choose the depth you need</h2>
          </div>
          <div className={styles.journeyGrid}>
            <Link className={styles.journeyCard} to="/atlas">
              <span className={styles.cardIndex}>Explore / Demo</span>
              <h3>Build a mental model first</h3>
              <p>
                Drill into canonical views, inspect evidence, or use the same views in a
                keyboard-controlled presentation.
              </p>
              <strong>Open the architecture atlas →</strong>
            </Link>
            <Link className={styles.journeyCard} to="/docs/">
              <span className={styles.cardIndex}>Engineering reference</span>
              <h3>Trace the design to its proof</h3>
              <p>
                Read the contracts, flows, ADRs, extension guides, operating notes, research and
                historical material.
              </p>
              <strong>Open the full documentation →</strong>
            </Link>
          </div>
        </section>

        <section className={styles.principleStrip} aria-label="Architecture principles">
          <div>
            <strong>SPOT</strong>
            <span>One authority per concern</span>
          </div>
          <div>
            <strong>Decoupled</strong>
            <span>Published interfaces at trust boundaries</span>
          </div>
          <div>
            <strong>Evidence-backed</strong>
            <span>Status and proof shown separately</span>
          </div>
        </section>
      </main>
    </Layout>
  );
}
